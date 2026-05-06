import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchMmTasksByStatusGroup } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import type { TaskDetails } from "../types/api";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "MmTaskStatusList">;

function criticalityColor(level?: string) {
  switch (level?.toUpperCase()) {
    case "HIGH":   return "#8B0000";
    case "MEDIUM": return "#B35900";
    case "LOW":    return "#1E6545";
    default:       return "#7B1005";
  }
}

export function MmTaskStatusListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { statusGroup, label, color, rollingWindows } = route.params;
  const [windowDays, setWindowDays] = useState(route.params.windowDays);
  const { authState } = useAuth();

  const [tasks, setTasks] = useState<TaskDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);

  async function load(isRefresh = false) {
    if (!authState.session?.token) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const data = await fetchMmTasksByStatusGroup(authState.session.token, statusGroup, windowDays);
      setTasks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => { loadRef.current(); }, [windowDays]);
  const onRefresh = useCallback(() => load(true), [authState.session?.token, windowDays]);

  const filtered = tasks.filter((t) => {
    if (!searchActive || !searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return [t.taskName, t.machineName, t.lineName, t.employeeName, t.dueDate]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={26} color="#111" />
        </Pressable>

        {searchActive ? (
          <TextInput
            style={s.searchInput}
            placeholder="Search tasks…"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        ) : (
          <View style={s.titleGroup}>
            <View style={[s.statusDot, { backgroundColor: color }]} />
            <Text style={s.headerTitle}>{label}</Text>
            {!loading && (
              <View style={[s.countBadge, { backgroundColor: color + "22" }]}>
                <Text style={[s.countBadgeText, { color }]}>{tasks.length}</Text>
              </View>
            )}
          </View>
        )}

        <Pressable
          hitSlop={12}
          onPress={() => {
            if (searchActive) setSearchQuery("");
            setSearchActive((v) => !v);
          }}
        >
          <Ionicons
            name={searchActive ? "close-outline" : "search-outline"}
            size={26}
            color="#111"
          />
        </Pressable>
      </View>

      <View style={s.togglePadding}>
        <View style={s.toggleContainer}>
          <Pressable
            style={[s.toggleBtn, windowDays === 365 && s.toggleBtnActive]}
            onPress={() => setWindowDays(365)}
          >
            <Text style={[s.toggleBtnText, windowDays === 365 && s.toggleBtnTextActive]}>365 Days</Text>
          </Pressable>
          <Pressable
            style={[s.toggleBtn, windowDays === 30 && s.toggleBtnActive]}
            onPress={() => setWindowDays(30)}
          >
            <Text style={[s.toggleBtnText, windowDays === 30 && s.toggleBtnTextActive]}>30 Days</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading tasks…</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="warning-outline" size={40} color={colors.danger} />
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.scheduleExecutionId)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Ionicons name="checkmark-circle-outline" size={48} color={color} />
              <Text style={s.emptyText}>No tasks in this category</Text>
            </View>
          }
          renderItem={({ item }) => {
            const stripeColor = criticalityColor(item.taskCriticality);
            const path = [item.machineName, item.machineElementName, item.machinePartName]
              .filter(Boolean)
              .join(" › ");
            const lineDisplay = item.lineCode || item.lineName || "LINE";
            return (
              <View style={s.card}>
                <View style={[s.strip, { backgroundColor: stripeColor }]}>
                  <View style={s.stripTextWrap}>
                    <Text style={s.stripText}>{lineDisplay}</Text>
                  </View>
                </View>
                <View style={s.cardBody}>
                  <View style={s.cardTop}>
                    <Text style={s.taskName} numberOfLines={2}>{item.taskName}</Text>
                    {item.block ? (
                      <View style={s.blockBadge}>
                        <Text style={s.blockText}>{item.block}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={s.path} numberOfLines={1}>{path}</Text>
                  <View style={s.cardBottom}>
                    {item.dueDate ? (
                      <View style={s.metaChip}>
                        <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                        <Text style={s.metaText}>Due: {item.dueDate.split("T")[0]}</Text>
                      </View>
                    ) : null}
                    {item.employeeName ? (
                      <View style={s.metaChip}>
                        <Ionicons name="person-outline" size={12} color={colors.textMuted} />
                        <Text style={s.metaText}>{item.employeeName}</Text>
                      </View>
                    ) : null}
                    {item.taskCriticality ? (
                      <View style={[s.critBadge, { borderColor: stripeColor }]}>
                        <Text style={[s.critText, { color: stripeColor }]}>{item.taskCriticality}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  titleGroup: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  headerTitle: { fontFamily: "Jost_600SemiBold", fontSize: 19, lineHeight: 24, color: "#111", flex: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  countBadgeText: { fontFamily: "Jost_600SemiBold", fontSize: 13 },
  searchInput: {
    flex: 1,
    marginHorizontal: 12,
    fontFamily: "Jost_400Regular",
    fontSize: 16,
    color: "#111",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  errorText: { color: colors.danger, fontSize: 14, textAlign: "center" },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 10 },
  retryBtnText: { color: "#fff", fontWeight: "600" },

  list: { padding: 18, gap: 14, paddingBottom: 60 },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: "Jost_400Regular", color: colors.textMuted, fontSize: 15 },

  card: {
    flexDirection: "row", borderRadius: 24, backgroundColor: colors.surfaceAlt,
    overflow: "hidden", minHeight: 96,
    borderWidth: 1,
    borderColor: "#EBEBF5",
  },
  strip: { width: 26, alignItems: "center", justifyContent: "center" },
  stripTextWrap: { width: 90, transform: [{ rotate: "-90deg" }], alignItems: "center" },
  stripText: { color: "#fff", fontFamily: "Jost_600SemiBold", fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase" },

  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  taskName: { flex: 1, fontFamily: "Jost_600SemiBold", fontSize: 15, lineHeight: 20, color: "#111", paddingRight: 8 },
  blockBadge: {
    backgroundColor: "#111", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
    flexShrink: 0,
  },
  blockText: { color: "#fff", fontFamily: "Jost_600SemiBold", fontSize: 10 },

  path: { fontFamily: "Jost_400Regular", fontSize: 12, color: colors.textMuted, marginBottom: 8, lineHeight: 16 },
  cardBottom: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  metaText: { fontFamily: "Jost_400Regular", fontSize: 11, color: colors.textMuted },
  critBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  critText: { fontFamily: "Jost_600SemiBold", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  togglePadding: { paddingHorizontal: 18, paddingVertical: 4 },
  toggleContainer: {
    flexDirection: "row",
    padding: 4,
    backgroundColor: colors.primaryMuted,
    borderRadius: 16,
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  toggleBtnTextActive: {
    color: "#fff",
  },
});
