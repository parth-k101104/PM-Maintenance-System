import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchConfigParams, updateConfigParam } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import type { ConfigParam } from "../types/api";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function validateValue(param: ConfigParam, value: string) {
  if (!value.trim()) return "Value cannot be blank.";
  const type = param.dataType?.toUpperCase();
  if (type === "INTEGER" && !/^-?\d+$/.test(value)) return "Enter a whole number.";
  if (type === "LONG" && !/^-?\d+$/.test(value)) return "Enter a whole number.";
  if (type === "DOUBLE" && Number.isNaN(Number(value))) return "Enter a number.";
  if (type === "BOOLEAN" && !["true", "false"].includes(value.toLowerCase())) return "Enter true or false.";
  return null;
}

export function ConfigParamsScreen() {
  const navigation = useNavigation<Nav>();
  const { authState } = useAuth();
  const [params, setParams] = useState<ConfigParam[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return params.reduce<Record<string, ConfigParam[]>>((acc, param) => {
      const category = param.paramCategory || "GENERAL";
      acc[category] = [...(acc[category] ?? []), param];
      return acc;
    }, {});
  }, [params]);

  const rows = useMemo(() => {
    return Object.keys(grouped)
      .sort()
      .flatMap((category) => [
        { type: "header" as const, key: `category:${category}`, category },
        ...grouped[category].map((param) => ({ type: "param" as const, key: param.paramKey, param })),
      ]);
  }, [grouped]);

  const load = useCallback(
    async (asRefresh = false) => {
      if (!authState.session?.token) return;
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await fetchConfigParams(authState.session.token);
        setParams(data);
        setDrafts(Object.fromEntries(data.map((param) => [param.paramKey, param.paramValue])));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load config parameters");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authState.session?.token],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function save(param: ConfigParam) {
    if (!authState.session?.token || savingKey) return;
    const nextValue = drafts[param.paramKey] ?? "";
    const validation = validateValue(param, nextValue);
    if (validation) {
      setMessage(validation);
      return;
    }

    setSavingKey(param.paramKey);
    setMessage(null);
    try {
      const updated = await updateConfigParam(authState.session.token, param.paramKey, nextValue.trim());
      setParams((current) => current.map((item) => (item.paramKey === updated.paramKey ? updated : item)));
      setDrafts((current) => ({ ...current, [updated.paramKey]: updated.paramValue }));
      setMessage(`${updated.paramKey} updated.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update parameter.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={26} color="#111" />
        </Pressable>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Config Parameters</Text>
          <Text style={s.headerSubtitle}>Runtime business settings</Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading parameters...</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="warning-outline" size={36} color={colors.danger} />
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.key}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          ListHeaderComponent={message ? <Text style={s.message}>{message}</Text> : null}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <Text style={s.category}>{item.category}</Text>;
            }

            const param = item.param;
            const draft = drafts[param.paramKey] ?? "";
            const changed = draft !== param.paramValue;
            return (
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.paramTitleWrap}>
                    <Text style={s.paramKey}>{param.paramKey}</Text>
                    <Text style={s.paramType}>{param.dataType}</Text>
                  </View>
                  <View style={[s.activePill, !param.active && s.inactivePill]}>
                    <Text style={s.activePillText}>{param.active === false ? "Inactive" : "Active"}</Text>
                  </View>
                </View>
                <Text style={s.description}>{param.description || "No description provided."}</Text>
                <View style={s.editRow}>
                  <TextInput
                    style={s.input}
                    value={draft}
                    onChangeText={(value) => setDrafts((current) => ({ ...current, [param.paramKey]: value }))}
                    placeholder="Value"
                    placeholderTextColor={colors.textSoft}
                    autoCapitalize="none"
                  />
                  <Pressable
                    style={[s.saveBtn, (!changed || savingKey === param.paramKey) && s.saveBtnDisabled]}
                    onPress={() => save(param)}
                    disabled={!changed || savingKey === param.paramKey}
                  >
                    {savingKey === param.paramKey ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={s.saveText}>Save</Text>
                    )}
                  </Pressable>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    gap: 12,
  },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: "Jost_600SemiBold", fontSize: 20, color: colors.text },
  headerSubtitle: { fontFamily: "Jost_400Regular", fontSize: 12, color: colors.textMuted, marginTop: 2 },
  list: { padding: 18, paddingBottom: 48, gap: 12 },
  category: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 14,
    color: colors.primary,
    marginTop: 8,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EBEBF5",
    padding: 16,
    gap: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  paramTitleWrap: { flex: 1, gap: 4 },
  paramKey: { fontFamily: "Jost_600SemiBold", fontSize: 15, color: colors.text },
  paramType: { fontFamily: "Jost_400Regular", fontSize: 11, color: colors.textMuted },
  activePill: { backgroundColor: "#D2E0D1", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  inactivePill: { backgroundColor: "#FDE8E7" },
  activePillText: { fontFamily: "Jost_600SemiBold", fontSize: 11, color: colors.text },
  description: { fontFamily: "Jost_400Regular", fontSize: 13, lineHeight: 18, color: colors.textMuted },
  editRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    minHeight: 44,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EBEBF5",
    paddingHorizontal: 12,
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    color: colors.text,
  },
  saveBtn: {
    width: 72,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveText: { fontFamily: "Jost_600SemiBold", color: "#fff", fontSize: 13 },
  message: {
    fontFamily: "Jost_400Regular",
    color: colors.primary,
    backgroundColor: colors.primaryMuted,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  loadingText: { fontFamily: "Jost_400Regular", color: colors.textMuted, fontSize: 14 },
  errorText: { fontFamily: "Jost_400Regular", color: colors.danger, fontSize: 14, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 14 },
  retryText: { color: "#fff", fontFamily: "Jost_600SemiBold" },
});
