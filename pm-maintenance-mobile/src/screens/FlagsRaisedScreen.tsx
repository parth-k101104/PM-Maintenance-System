import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchMyFlags } from "../api/client";
import { FlagListCard, getFlagStatusColor } from "../components/FlagListCard";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { IssueFlag } from "../types/api";
import { RootStackParamList } from "../types/navigation";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Sort order for the list (highest priority first)
const STATUS_ORDER: Record<string, number> = {
  REPLACEMENT_INITIATED: 1,
  REPLACEMENT_REQUIRED: 2,
  POTENTIAL_REPLACEMENT: 3,
};

const STATUS_TABS = [
  { id: "REPLACEMENT_INITIATED", label: "Initiated" },
  { id: "REPLACEMENT_REQUIRED", label: "Required" },
  { id: "POTENTIAL_REPLACEMENT", label: "Potential" },
];

export function FlagsRaisedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { authState } = useAuth();
  const [flags, setFlags] = useState<IssueFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState(STATUS_TABS[0].id);
  const horizontalListRef = useRef<FlatList>(null);

  const handleTabPress = (status: string, index: number) => {
    setSelectedStatus(status);
    horizontalListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (STATUS_TABS[index]) {
      setSelectedStatus(STATUS_TABS[index].id);
    }
  };

  async function loadFlags() {
    if (!authState.session) return;
    try {
      const data = await fetchMyFlags(authState.session.token);
      
      // Sort flags: Active/Actionable first, then by date
      const sorted = data.sort((a, b) => {
        const orderA = STATUS_ORDER[a.status] || 99;
        const orderB = STATUS_ORDER[b.status] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.raisedDttm).getTime() - new Date(a.raisedDttm).getTime();
      });

      setFlags(sorted);
    } catch (e) {
      console.error("Failed to fetch flags", e);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFlags();
    }, [authState.session])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color="#111111" />
        </Pressable>
        <Text style={styles.headerTitle}>Flags raised</Text>
      </View>

      <View style={styles.tabsContainer}>
        {STATUS_TABS.map((tab, index) => {
          const isSelected = selectedStatus === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, isSelected && { borderBottomColor: getFlagStatusColor(tab.id) }]}
              onPress={() => handleTabPress(tab.id, index)}
            >
              <Text style={[styles.tabText, isSelected && { color: getFlagStatusColor(tab.id) }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        ref={horizontalListRef}
        data={STATUS_TABS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item: tab }) => {
          const tabFlags = flags.filter((flag) => flag.status === tab.id);

          return (
            <View style={{ width: SCREEN_WIDTH }}>
              <FlatList
                data={tabFlags}
                keyExtractor={(item) => String(item.flagId)}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No flags found for this status.</Text>
                }
                renderItem={({ item }) => {
                  const isActionable = item.status === "REPLACEMENT_INITIATED";

                  return (
                    <FlagListCard
                      flag={item}
                      showChevron={isActionable}
                      actionLabel={isActionable ? "Complete Replacement" : undefined}
                      onPress={() => {
                        if (isActionable) {
                          navigation.navigate("FlagDetail", { flag: item });
                        }
                      }}
                    />
                  );
                }}
              />
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontFamily: "Jost_500Medium",
    fontSize: 22,
    flex: 1,
    marginLeft: 16,
    color: "#111111",
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    paddingBottom: 8,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    paddingHorizontal: 4,
    marginBottom: -1,
  },
  tabText: {
    fontFamily: "Jost_500Medium",
    fontSize: 16,
    color: "#9CA3AF",
  },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 50 },
  emptyText: {
    fontFamily: "Jost_400Regular",
    textAlign: "center",
    marginTop: 36,
    fontSize: 15,
    color: "#6B7280",
  },
});
