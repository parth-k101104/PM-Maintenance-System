import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { LineChart } from "react-native-gifted-charts";
import Slider from "@react-native-community/slider";

import {
  fetchPartAnalytics,
  runAnalyticsSyncJob,
  acknowledgeLineManagerInsight,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import type { PartAnalyticsResponse, SeriesPoint } from "../types/api";
import type { RootStackParamList } from "../types/navigation";

type ScreenRouteProp = RouteProp<RootStackParamList, "LineManagerPartAnalytics">;

const SCREEN_WIDTH = Dimensions.get("window").width;
// Chart occupies screen width minus horizontal padding (20 * 2) minus y-axis width (~40)
const CHART_WIDTH = SCREEN_WIDTH - 40 - 40;

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  current:    "#6366F1",  // indigo  — current cycle line
  projection: "#EF4444",  // red     — simulated failure projection
  master:     "#8B5CF6",  // violet  — master curve
  hist:       ["#94A3B8", "#64748B", "#475569"], // slate shades for historical
  threshold:  "#EF4444",
  warning:    "#F59E0B",
  dot:        "#6366F1",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert the engine's sparse {day, value} points into a dense array that
 * Gifted Charts can render. The key insight: we normalise every series onto a
 * shared day-axis (0 … maxDay) and interpolate missing days linearly so the
 * chart renders each series at the correct horizontal position.
 *
 * spacing = CHART_WIDTH / maxDay  →  point at day N sits at pixel N * spacing
 */
/**
 * Build x-axis labels: show a date label every N days.
 */
function buildXLabels(
  allPoints: SeriesPoint[],
  maxDay: number,
  labelEvery: number
): string[] {
  const dateMap = new Map(allPoints.map((p) => [p.day, p.date ?? ""]));
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const labels: string[] = [];
  for (let d = 0; d <= maxDay; d++) {
    if (d % labelEvery === 0) {
      const raw = dateMap.get(d) ?? "";
      if (raw) {
        const parts = raw.split("-");
        const m = parseInt(parts[1], 10) - 1;
        const y = parts[0].slice(2);
        labels.push(`${months[m]}'${y}`);
      } else {
        labels.push("");
      }
    } else {
      labels.push("");
    }
  }
  return labels;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function LineManagerPartAnalyticsScreen() {
  const route      = useRoute<ScreenRouteProp>();
  const navigation = useNavigation();
  const { authState } = useAuth();
  const { part } = route.params;

  const [data,    setData]    = useState<PartAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Two exclusive toggles — only one can be on at a time.
  // Turning one on automatically turns the other off.
  const [showHistory, setShowHistory] = useState(false);
  const [showMaster,  setShowMaster]  = useState(true);

  // Velocity simulation — 1.0 = backend default, slider range 0.25x … 3.0x
  const [velocityMultiplier, setVelocityMultiplier] = useState(1.0);
  // Track whether the user has deviated from default so Reset is only shown when needed
  const isVelocityModified = Math.abs(velocityMultiplier - 1.0) > 0.01;

  const handleToggleHistory = (v: boolean) => {
    setShowHistory(v);
    if (v) setShowMaster(false);
  };
  const handleToggleMaster = (v: boolean) => {
    setShowMaster(v);
    if (v) setShowHistory(false);
  };

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!authState.session?.token) return;
    setLoading(true);
    try {
      const res = await fetchPartAnalytics(authState.session.token, part.partId);
      setData(res);
    } catch (err) {
      console.error("Failed to load part analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [authState.session?.token, part.partId]);

  useEffect(() => { loadData(); }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleSync = async () => {
    if (!authState.session?.token || syncing) return;
    setSyncing(true);
    try {
      await runAnalyticsSyncJob(authState.session.token);
      await loadData();
    } finally {
      setSyncing(false);
    }
  };

  const handleAcknowledge = async (insightId: number) => {
    if (!authState.session?.token) return;
    try {
      await acknowledgeLineManagerInsight(authState.session.token, insightId);
      setData((prev) =>
        prev
          ? {
              ...prev,
              actionInsights: prev.actionInsights?.filter(
                (i) => i.insightId !== insightId
              ),
            }
          : null
      );
    } catch (err) {
      console.error("Failed to acknowledge insight:", err);
    }
  };

  // ── Chart data ─────────────────────────────────────────────────────────────
  // FIX: useMemo deps updated to use `showHistory` and `showMaster` (the actual
  // state variables) instead of the non-existent `showHistory`/`showMaster`.
  const chartConfig = useMemo(() => {
    if (!data) return null;

    const currentCycle     = data.currentCycle          ?? [];
    const historicalCycles = data.historicalCycles      ?? [];
    const masterCurve      = data.masterCurve           ?? [];
    const simulated        = data.simulatedFailureCurve ?? [];
    const threshold        = data.thresholds?.toleranceMax ?? 4.0;
    const warning          = data.thresholds?.warningValue ?? threshold * 0.875;

    // ── Shared x-axis extent ─────────────────────────────────────────────────
    const sortedCurrent = [...currentCycle].sort((a, b) => a.day - b.day);
    const currentMax    = sortedCurrent.length ? sortedCurrent.at(-1)!.day : 0;
    const simulatedMax  = simulated.length  ? [...simulated].sort((a,b)=>a.day-b.day).at(-1)!.day : 0;
    const masterMax     = masterCurve.length ? [...masterCurve].sort((a,b)=>a.day-b.day).at(-1)!.day : 0;
    const maxDay        = Math.max(currentMax, simulatedMax, masterMax);
    if (maxDay === 0) return null;

    const spacing = Math.max(1, CHART_WIDTH / maxDay);

    // ── Y axis scale ─────────────────────────────────────────────────────────
    const allValues = [
      ...currentCycle.map((p) => p.value),
      // Use scaled projection values for Y-axis so chart doesn't clip when
      // velocity is increased above default
      ...(simulated.length > 0 && sortedCurrent.at(-1)
        ? (() => {
            const anchor = sortedCurrent.at(-1)!;
            const sortedSim2 = [...simulated].sort((a, b) => a.day - b.day);
            const simAtAnchor = (() => {
              const e = sortedSim2.find((p) => p.day === anchor.day);
              if (e) return e.value;
              const b2 = sortedSim2.filter((p) => p.day <= anchor.day).at(-1);
              const a2 = sortedSim2.find((p) => p.day > anchor.day);
              if (!b2) return sortedSim2[0].value;
              if (!a2) return sortedSim2.at(-1)!.value;
              return b2.value + (anchor.day - b2.day) / (a2.day - b2.day) * (a2.value - b2.value);
            })();
            return sortedSim2
              .filter((p) => p.day > anchor.day)
              .map((p) => anchor.value + (p.value - simAtAnchor) * velocityMultiplier);
          })()
        : simulated.map((p) => p.value)),
      ...(showMaster  ? masterCurve.map((p) => p.value) : []),
      ...(showHistory ? historicalCycles.flatMap((c) => c.points.map((p) => p.value)) : []),
      threshold,
    ];
    const rawMax       = Math.max(...allValues);
    const maxValue     = Math.ceil(rawMax * 1.1 * 10) / 10;
    const noOfSections = 5;
    const stepValue    = parseFloat((maxValue / noOfSections).toFixed(2));

    // ── Dense-array builder ──────────────────────────────────────────────────
    // Interpolates a sparse SeriesPoint[] onto a dense 0…maxDay index array.
    // Returns { data, startIndex, endIndex } so the caller can tell Gifted
    // Charts exactly which slice of the array to draw a line through — this
    // is the ONLY reliable way to prevent the library from extending the line
    // beyond the series' real data range.
    const buildSeries = (
      points: SeriesPoint[],
      opts: { color: string; showDots?: boolean; clipEnd?: number }
    ): { data: object[]; startIndex: number; endIndex: number } => {
      if (!points || points.length === 0) {
        const empty = new Array(maxDay + 1).fill({ value: 0, hideDataPoint: true });
        return { data: empty, startIndex: 0, endIndex: 0 };
      }

      const sorted   = [...points].sort((a, b) => a.day - b.day);
      const map      = new Map(sorted.map((p) => [p.day, p.value]));
      const firstDay = sorted[0].day;
      const lastDay  = opts.clipEnd !== undefined
        ? Math.min(sorted.at(-1)!.day, opts.clipEnd)
        : sorted.at(-1)!.day;

      // Interpolate value at lastDay in case clipEnd falls mid-segment
      const valueAtLastDay = (() => {
        const e = map.get(lastDay);
        if (e !== undefined) return e;
        const bef = sorted.filter((p) => p.day <= lastDay).at(-1);
        const aft = sorted.find((p) => p.day > lastDay);
        if (!bef || !aft) return sorted.at(-1)!.value;
        return bef.value + (lastDay - bef.day) / (aft.day - bef.day) * (aft.value - bef.value);
      })();

      const data: object[] = [];

      for (let d = 0; d <= maxDay; d++) {
        if (d < firstDay || d > lastDay) {
          // Outside the active range — emit a value that sits at the nearest
          // boundary so if Gifted Charts does draw it, it won't look wrong.
          // The key is startIndex/endIndex will suppress the line here.
          data.push({
            value: d < firstDay ? sorted[0].value : valueAtLastDay,
            hideDataPoint: true,
          });
          continue;
        }

        const exact = map.get(d);
        let val: number;

        if (exact !== undefined) {
          val = exact;
        } else {
          const before = sorted.filter((p) => p.day <= d).at(-1);
          const after  = sorted.find((p)  => p.day > d);
          if (!before) {
            val = sorted[0].value;
          } else if (!after) {
            val = valueAtLastDay;
          } else {
            const ratio = (d - before.day) / (after.day - before.day);
            val = before.value + ratio * (after.value - before.value);
          }
        }

        const isEndpoint = d === firstDay || d === lastDay;
        const showDot    = !!(opts.showDots && map.has(d) && isEndpoint);

        data.push({
          value: val,
          hideDataPoint: !showDot,
          dataPointColor: opts.color,
          dataPointRadius: showDot ? 4 : 0,
        });
      }

      return { data, startIndex: firstDay, endIndex: lastDay };
    };

    // ── Current cycle ────────────────────────────────────────────────────────
    // Clip exactly at currentMax so the line stops at the last real reading.
    const current = buildSeries(currentCycle, { color: C.current, showDots: true, clipEnd: currentMax });

    // ── Projection ───────────────────────────────────────────────────────────
    // The projection starts at the last current-cycle reading (anchor) and
    // applies the velocityMultiplier to the per-day degradation increments from
    // the backend simulation. multiplier = 1.0 → identical to backend curve;
    // multiplier > 1 → faster degradation (steeper); < 1 → slower (flatter).
    const lastCurrentPoint = sortedCurrent.at(-1);
    let projection: { data: object[]; startIndex: number; endIndex: number } | null = null;

    if (simulated.length > 0 && lastCurrentPoint) {
      const anchorDay   = lastCurrentPoint.day;
      const anchorValue = lastCurrentPoint.value;

      // Sort the raw simulation points and find the value at anchorDay so we
      // can compute increments relative to that baseline.
      const sortedSim = [...simulated].sort((a, b) => a.day - b.day);

      // Interpolate the simulation value exactly at anchorDay (the curve may
      // not have a knot there).
      const simValueAtAnchor = (() => {
        const exact = sortedSim.find((p) => p.day === anchorDay);
        if (exact) return exact.value;
        const bef = sortedSim.filter((p) => p.day <= anchorDay).at(-1);
        const aft = sortedSim.find((p) => p.day > anchorDay);
        if (!bef) return sortedSim[0].value;
        if (!aft) return sortedSim.at(-1)!.value;
        return bef.value + (anchorDay - bef.day) / (aft.day - bef.day) * (aft.value - bef.value);
      })();

      // Re-scale every simulation point that comes after the anchor:
      //   scaledValue = anchorValue + (simValue - simValueAtAnchor) * multiplier
      // This preserves the curve shape but stretches/compresses the slope.
      const scaledPoints: SeriesPoint[] = [
        { day: anchorDay, value: anchorValue, date: lastCurrentPoint.date ?? "" },
        ...sortedSim
          .filter((p) => p.day > anchorDay)
          .map((p) => ({
            day:   p.day,
            date:  p.date ?? "",
            value: anchorValue + (p.value - simValueAtAnchor) * velocityMultiplier,
          })),
      ];

      projection = buildSeries(scaledPoints, { color: C.projection, showDots: false });
    }

    // ── Master curve ─────────────────────────────────────────────────────────
    const master = showMaster
      ? buildSeries(masterCurve, { color: C.master, showDots: false })
      : null;

    // ── Historical cycles ────────────────────────────────────────────────────
    const hist = showHistory
      ? historicalCycles.map((cyc) =>
          buildSeries(cyc.points, { color: C.hist[0], showDots: false })
        )
      : [];

    // ── x-axis labels ────────────────────────────────────────────────────────
    const allDatedPoints: SeriesPoint[] = [...currentCycle, ...simulated, ...masterCurve];
    const labelEvery = Math.max(1, Math.round(maxDay / 6));
    const xLabels    = buildXLabels(allDatedPoints, maxDay, labelEvery);

    // ── dataSets — render order: hist → master → current → projection ────────
    const dataSets: object[] = [];

    hist.forEach((h, i) => {
      dataSets.push({
        data: h.data,
        startIndex: h.startIndex,
        endIndex: h.endIndex,
        color: C.hist[i % C.hist.length],
        thickness: 1,
        curved: true,
      });
    });

    if (master) {
      dataSets.push({
        data: master.data,
        startIndex: master.startIndex,
        endIndex: master.endIndex,
        color: C.master,
        thickness: 1.5,
        strokeDashArray: [5, 4],
        curved: true,
      });
    }

    dataSets.push({
      data: current.data,
      startIndex: current.startIndex,
      endIndex: current.endIndex,
      color: C.current,
      thickness: 2.5,
      curved: false,
    });

    if (projection) {
      dataSets.push({
        data: projection.data,
        startIndex: projection.startIndex,
        endIndex: projection.endIndex,
        color: C.projection,
        thickness: 2,
        strokeDashArray: [6, 5],
        curved: false,
      });
    }

    return {
      dataSets,
      maxValue,
      noOfSections,
      stepValue,
      threshold,
      warning,
      spacing,
      xLabels,
      maxDay,
    };
  }, [data, showHistory, showMaster, velocityMultiplier]);

  // ── Derived display values ─────────────────────────────────────────────────
  const riskScore   = data?.riskScore ?? 0;
  const statusColor =
    riskScore > 75 ? "#B42318" : riskScore > 40 ? "#F59E0B" : "#10B981";
  const statusLabel =
    riskScore > 75 ? "CRITICAL" : riskScore > 40 ? "WARNING" : "STABLE";

  const daysRemaining = data?.daysRemaining;
  const daysDisplay =
    daysRemaining === 0
      ? "Overdue"
      : daysRemaining != null
      ? `${daysRemaining}d`
      : "—";

  const predDate = data?.predictedFailureDate
    ? (() => {
        const d = new Date(data.predictedFailureDate);
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return `${d.getDate()} ${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
      })()
    : "—";

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color={colors.primary} style={s.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <View style={s.headerText}>
          <Text style={s.title} numberOfLines={1}>{part.partName}</Text>
          <Text style={s.subtitle} numberOfLines={1}>{part.equipmentName}</Text>
        </View>
        <Pressable onPress={handleSync} style={s.syncBtn} disabled={syncing}>
          {syncing
            ? <ActivityIndicator size="small" color="#111827" />
            : <Ionicons name="sync" size={20} color="#111827" />}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Health card ── */}
        <View style={s.card}>
          <View style={s.statusRow}>
            <View style={[s.badge, { backgroundColor: statusColor + "18" }]}>
              <View style={[s.dot, { backgroundColor: statusColor }]} />
              <Text style={[s.badgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            <MetricPill
              label="Risk"
              value={`${Math.round(riskScore)}%`}
              color={statusColor}
            />
            <MetricPill
              label="Confidence"
              value={`${Math.round(data?.confidenceScore ?? 0)}%`}
              color="#6366F1"
            />
          </View>

          <View style={s.divider} />

          <View style={s.kpiRow}>
            <KPI
              label="Days remaining"
              value={daysDisplay}
              valueStyle={[
                s.kpiVal,
                {
                  color: daysRemaining === 0 ? "#B42318" : "#111827",
                  fontSize: 22,
                },
              ]}
            />
            <KPISep />
            <KPI
              label="Current value"
              value={`${(data?.currentValue ?? 0).toFixed(2)} ${data?.thresholds?.uom ?? ""}`}
            />
            <KPISep />
            <KPI label="Est. failure" value={predDate} />
          </View>
        </View>

        {/* ── Chart card ── */}
        <View style={s.card}>
          <View style={s.chartHeader}>
            <Text style={s.sectionTitle}>Performance analytics</Text>
          </View>

          {/* Legend */}
          <View style={s.legendRow}>
            <LegendItem color={C.current}    label="Current" />
            <LegendItem color={C.projection} label="Projection" dashed />
            {showMaster && (
              <LegendItem color={C.master} label="Master curve" dashed />
            )}
            {showHistory &&
              data?.historicalCycles?.map((c, i) => (
                <LegendItem
                  key={c.cycleIndex}
                  color={C.hist[i % C.hist.length]}
                  label={`Cycle ${c.cycleIndex}`}
                />
              ))}
            <LegendItem color={C.threshold} label="Threshold" line />
            <LegendItem color={C.warning}   label="Warning"   line />
          </View>

          {/* Chart */}
          <View style={s.chartBox}>
            {chartConfig ? (
              <LineChart
                dataSet={chartConfig.dataSets}
                height={220}
                width={CHART_WIDTH}
                initialSpacing={0}
                endSpacing={0}
                spacing={chartConfig.spacing}
                xAxisLabelTexts={chartConfig.xLabels}
                xAxisLabelTextStyle={s.axisLabel}
                xAxisColor="#E5E7EB"
                maxValue={chartConfig.maxValue}
                noOfSections={chartConfig.noOfSections}
                stepValue={chartConfig.stepValue}
                yAxisTextStyle={s.axisLabel}
                yAxisColor="#E5E7EB"
                yAxisTextNumberOfLines={1}
                rulesColor="#F3F4F6"
                rulesType="solid"
                showReferenceLine1
                referenceLine1Position={chartConfig.threshold}
                referenceLine1Config={{
                  color: C.threshold,
                  thickness: 1.5,
                  dashWidth: 0,
                  dashGap: 0,
                  labelText: `${chartConfig.threshold}`,
                  labelTextStyle: { color: C.threshold, fontSize: 9 },
                }}
                showReferenceLine2
                referenceLine2Position={chartConfig.warning}
                referenceLine2Config={{
                  color: C.warning,
                  thickness: 1,
                  dashWidth: 4,
                  dashGap: 4,
                  labelText: `${chartConfig.warning}`,
                  labelTextStyle: { color: C.warning, fontSize: 9 },
                }}
                hideDataPoints
                curved={false}
                disableScroll
                scrollToEnd={false}
              />
            ) : (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>No cycle data available</Text>
              </View>
            )}
          </View>

          {/* Toggles */}
          <View style={s.toggleGroup}>
            <ToggleRow
              label="Show historical cycles"
              value={showHistory}
              onChange={handleToggleHistory}
            />
            <View style={s.toggleDivider} />
            <ToggleRow
              label="Show master curve"
              value={showMaster}
              onChange={handleToggleMaster}
            />
          </View>
        </View>

        {/* ── Velocity simulator card ── */}
        {data?.degradationVelocity != null && (
          <VelocitySimulatorCard
            defaultVelocity={data.degradationVelocity}
            multiplier={velocityMultiplier}
            onMultiplierChange={setVelocityMultiplier}
            onReset={() => setVelocityMultiplier(1.0)}
            isModified={isVelocityModified}
          />
        )}

        {/* ── Action insights ── */}
        {(data?.actionInsights?.length ?? 0) > 0 && (
          <View>
            <Text style={[s.sectionTitle, { marginBottom: 12 }]}>
              Alerts &amp; insights
            </Text>
            {data!.actionInsights!.map((insight) => (
              <View
                key={insight.insightId}
                style={[
                  s.insightCard,
                  {
                    borderLeftColor:
                      insight.severity === "CRITICAL" ? "#B42318" : "#F59E0B",
                  },
                ]}
              >
                <View style={s.insightHead}>
                  <View
                    style={[
                      s.sevBadge,
                      {
                        backgroundColor:
                          insight.severity === "CRITICAL"
                            ? "#FEE2E2"
                            : "#FEF3C7",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.sevText,
                        {
                          color:
                            insight.severity === "CRITICAL"
                              ? "#B42318"
                              : "#92400E",
                        },
                      ]}
                    >
                      {insight.severity}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleAcknowledge(insight.insightId)}
                    style={s.ackBtn}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#6B7280"
                    />
                    <Text style={s.ackText}>Acknowledge</Text>
                  </Pressable>
                </View>
                <Text style={s.insightMsg}>{insight.message}</Text>
                {insight.createdAt && (
                  <Text style={s.insightDate}>
                    {new Date(insight.createdAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function MetricPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text
        style={{
          fontSize: 18,
          fontFamily: "Jost_600SemiBold",
          color: "#111827",
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Jost_400Regular",
          color: "#6B7280",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function KPI({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: any;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text
        style={valueStyle ?? s.kpiVal}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={s.kpiLab}>{label}</Text>
    </View>
  );
}

function KPISep() {
  return (
    <View style={{ width: 1, height: 36, backgroundColor: "#F3F4F6" }} />
  );
}

function LegendItem({
  color,
  label,
  dashed,
  line,
}: {
  color: string;
  label: string;
  dashed?: boolean;
  line?: boolean;
}) {
  return (
    <View style={s.legendItem}>
      {line ? (
        <View
          style={{ width: 14, height: 2, backgroundColor: color, borderRadius: 1 }}
        />
      ) : dashed ? (
        <View style={{ flexDirection: "row", gap: 2, alignItems: "center" }}>
          <View
            style={{ width: 5, height: 2, backgroundColor: color, borderRadius: 1 }}
          />
          <View
            style={{ width: 5, height: 2, backgroundColor: color, borderRadius: 1 }}
          />
        </View>
      ) : (
        <View
          style={{ width: 14, height: 2, backgroundColor: color, borderRadius: 1 }}
        />
      )}
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#E5E7EB", true: "#6366F180" }}
        thumbColor={value ? "#6366F1" : "#F9FAFB"}
        ios_backgroundColor="#E5E7EB"
      />
    </View>
  );
}


// ─── Velocity Simulator Card ──────────────────────────────────────────────────

function VelocitySimulatorCard({
  defaultVelocity,
  multiplier,
  onMultiplierChange,
  onReset,
  isModified,
}: {
  defaultVelocity: number;
  multiplier: number;
  onMultiplierChange: (v: number) => void;
  onReset: () => void;
  isModified: boolean;
}) {
  const simulatedVelocity = defaultVelocity * multiplier;

  // Colour the velocity readout based on severity vs default
  const velocityColor =
    multiplier > 1.5 ? "#B42318" : multiplier > 1.0 ? "#F59E0B" : "#10B981";

  // Map multiplier (0.25 … 3.0) to a human-readable % change label
  const pctLabel =
    multiplier === 1.0
      ? "Default"
      : multiplier > 1.0
      ? `+${Math.round((multiplier - 1) * 100)}% faster`
      : `${Math.round((1 - multiplier) * 100)}% slower`;

  return (
    <View style={s.card}>
      {/* Header row */}
      <View style={vs.headerRow}>
        <View>
          <Text style={s.sectionTitle}>Velocity simulator</Text>
          <Text style={vs.subtitle}>Drag to simulate degradation speed</Text>
        </View>
        {isModified && (
          <Pressable onPress={onReset} style={vs.resetBtn}>
            <Ionicons name="refresh" size={14} color="#6366F1" />
            <Text style={vs.resetText}>Reset</Text>
          </Pressable>
        )}
      </View>

      {/* Velocity readout */}
      <View style={vs.readoutRow}>
        <View style={vs.readoutBox}>
          <Text style={[vs.readoutValue, { color: "#111827" }]}>
            {defaultVelocity.toFixed(3)}
          </Text>
          <Text style={vs.readoutLabel}>Default velocity</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
        <View style={[vs.readoutBox, vs.readoutBoxActive, { borderColor: velocityColor + "40", backgroundColor: velocityColor + "08" }]}>
          <Text style={[vs.readoutValue, { color: velocityColor }]}>
            {simulatedVelocity.toFixed(3)}
          </Text>
          <Text style={vs.readoutLabel}>Simulated velocity</Text>
        </View>
        <View style={[vs.pctBadge, {
          backgroundColor:
            multiplier > 1.5 ? "#FEE2E2" : multiplier > 1.0 ? "#FEF3C7" : "#D1FAE5",
        }]}>
          <Text style={[vs.pctText, { color: velocityColor }]}>{pctLabel}</Text>
        </View>
      </View>

      {/* Slider */}
      <View style={vs.sliderWrap}>
        <Text style={vs.sliderBound}>0.25×</Text>
        <Slider
          style={vs.slider}
          minimumValue={0.25}
          maximumValue={3.0}
          step={0.05}
          value={multiplier}
          onValueChange={onMultiplierChange}
          minimumTrackTintColor="#6366F1"
          maximumTrackTintColor="#E5E7EB"
          thumbTintColor="#6366F1"
        />
        <Text style={vs.sliderBound}>3×</Text>
      </View>

      {/* Tick marks */}
      <View style={vs.tickRow}>
        {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0].map((v) => (
          <Pressable key={v} onPress={() => onMultiplierChange(v)} style={vs.tick}>
            <View style={[vs.tickMark, Math.abs(multiplier - v) < 0.03 && vs.tickMarkActive]} />
            {[0.25, 1.0, 2.0, 3.0].includes(v) && (
              <Text style={vs.tickLabel}>{v}×</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const vs = StyleSheet.create({
  headerRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  subtitle:       { fontSize: 12, fontFamily: "Jost_400Regular", color: "#9CA3AF", marginTop: 2 },
  resetBtn:       { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#EEF2FF", borderRadius: 8 },
  resetText:      { fontSize: 12, fontFamily: "Jost_600SemiBold", color: "#6366F1" },

  readoutRow:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  readoutBox:     { flex: 1, minWidth: 80, alignItems: "center", paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FAFAFA" },
  readoutBoxActive: { borderWidth: 1.5 },
  readoutValue:   { fontSize: 16, fontFamily: "Jost_600SemiBold", letterSpacing: -0.3 },
  readoutLabel:   { fontSize: 10, fontFamily: "Jost_400Regular", color: "#9CA3AF", marginTop: 2, textAlign: "center" },
  pctBadge:       { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pctText:        { fontSize: 11, fontFamily: "Jost_600SemiBold" },

  sliderWrap:     { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  slider:         { flex: 1, height: 40 },
  sliderBound:    { fontSize: 11, fontFamily: "Jost_500Medium", color: "#9CA3AF", width: 32, textAlign: "center" },

  tickRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 32 },
  tick:           { alignItems: "center", gap: 3 },
  tickMark:       { width: 1, height: 6, backgroundColor: "#D1D5DB" },
  tickMarkActive: { backgroundColor: "#6366F1", width: 2 },
  tickLabel:      { fontSize: 9, fontFamily: "Jost_400Regular", color: "#9CA3AF" },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  loader:    { marginTop: 60 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  backBtn:    { padding: 4, marginRight: 12 },
  headerText: { flex: 1, marginRight: 12 },
  title:      { fontSize: 17, fontFamily: "Jost_600SemiBold", color: "#111827" },
  subtitle:   { fontSize: 13, fontFamily: "Jost_400Regular",  color: "#6B7280", marginTop: 1 },
  syncBtn:    { padding: 8, backgroundColor: "#F3F4F6", borderRadius: 10 },

  // Scroll
  scroll: { padding: 20, paddingBottom: 48, gap: 16 },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  // Health card
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  dot:      { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  badgeText: { fontSize: 11, fontFamily: "Jost_600SemiBold" },
  divider:   {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#F3F4F6",
    marginVertical: 16,
  },
  kpiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiVal: {
    fontSize: 15,
    fontFamily: "Jost_600SemiBold",
    color: "#111827",
    textAlign: "center",
  },
  kpiLab: {
    fontSize: 10,
    fontFamily: "Jost_400Regular",
    color: "#9CA3AF",
    marginTop: 3,
    textAlign: "center",
  },

  // Chart card
  chartHeader:  { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Jost_600SemiBold", color: "#111827" },

  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { fontSize: 10, fontFamily: "Jost_500Medium", color: "#6B7280" },

  chartBox: {
    overflow: "hidden",
    marginHorizontal: -4,
  },

  axisLabel: {
    color: "#9CA3AF",
    fontSize: 9,
    fontFamily: "Jost_400Regular",
  },

  emptyBox:  { height: 220, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#9CA3AF", fontFamily: "Jost_400Regular", fontSize: 13 },

  // Toggles
  toggleGroup: {
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
  },
  toggleDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#E5E7EB" },
  toggleLabel:   { fontSize: 14, fontFamily: "Jost_500Medium", color: "#374151" },

  // Insights
  insightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  insightHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sevText:  { fontSize: 10, fontFamily: "Jost_600SemiBold" },
  ackBtn:   {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
  },
  ackText:     { fontSize: 12, fontFamily: "Jost_500Medium", color: "#6B7280" },
  insightMsg:  {
    fontSize: 13,
    fontFamily: "Jost_400Regular",
    color: "#374151",
    lineHeight: 19,
  },
  insightDate: {
    fontSize: 11,
    fontFamily: "Jost_400Regular",
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "right",
  },
});
