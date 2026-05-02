import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart } from "react-native-gifted-charts";
import { Ionicons } from "@expo/vector-icons";
import { fetchEmployeeApprovalSummary } from "../api/client";
import { useAuth } from "../context/AuthContext";

type ChartDataItem = {
  label: string;
  approved: number;
  underReview: number;
  rejected: number;
};

export default function EmployeeApprovalChartScreen() {
  const { authState } = useAuth();
  const token = authState.session?.token;
  const [data, setData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"CURRENT_MONTH" | "YEAR">("CURRENT_MONTH");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const navigation = useNavigation();

  useEffect(() => {
    if (token) loadData();
  }, [token, period]);

  const loadData = async () => {
    try {
      if (!token) return;
      const response = await fetchEmployeeApprovalSummary(token, period);

      console.log("API RESPONSE:", response);
      console.log("TOKEN:", token);

      if (!response || response.length === 0) {
        setData([
          { label: "John", approved: 5, underReview: 3, rejected: 2 },
          { label: "Alice", approved: 8, underReview: 2, rejected: 1 },
          { label: "Mike", approved: 4, underReview: 5, rejected: 3 },
          { label: "John", approved: 5, underReview: 3, rejected: 2 },
          { label: "Alice", approved: 8, underReview: 2, rejected: 1 },
          { label: "Mike", approved: 4, underReview: 5, rejected: 3 },
          { label: "John", approved: 5, underReview: 3, rejected: 2 },
          { label: "Alice", approved: 8, underReview: 2, rejected: 1 },
          { label: "Mike", approved: 4, underReview: 5, rejected: 3 },
        ]);
        return;
      }

      const transformed = response.map((item) => ({
        label: item.employeeName || "Unknown",
        approved: Number(item.approved) || 0,
        underReview:
          Number(item.pendingSupervisorApproval || 0) +
          Number(item.underLineManagerReview || 0) +
          Number(item.underMaintManagerReview || 0),
        rejected: Number(item.rejected) || 0,
      }));

      setData(transformed);
    } catch (error) {
      console.error("Error loading chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={32} color="#000000" />
          </TouchableOpacity>
        </View>
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownLabel}>Select Period:</Text>
          <View style={styles.dropdownOptions}>
            <Text
              style={[
                styles.dropdownOption,
                period === "CURRENT_MONTH" && styles.activeOption,
              ]}
              onPress={() => setPeriod("CURRENT_MONTH")}
            >
              Current Month
            </Text>
            <Text
              style={[
                styles.dropdownOption,
                period === "YEAR" && styles.activeOption,
              ]}
              onPress={() => setPeriod("YEAR")}
            >
              Current Year
            </Text>
          </View>
        </View>

        <Text style={styles.title}>Employee Task Summary</Text>

        {data.map((item, index) => {
          const isOpen = expandedIndex === index;

          const singleChartData = [
            {
              value: item.approved,
              frontColor: "#A7F3D0",
            },
            {
              value: item.underReview,
              frontColor: "#FDE68A",
            },
            {
              value: item.rejected,
              frontColor: "#FCA5A5",
            },
          ];

          return (
            <View key={index} style={styles.card}>
              <View style={styles.accentBar} />
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                onPress={() =>
                  setExpandedIndex(isOpen ? null : index)
                }
              >
                <Text style={styles.employeeName}>{item.label}</Text>
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#000"
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.chartContainer}>
                  <BarChart
                    data={singleChartData}
                    barWidth={24}
                    spacing={20}
                    initialSpacing={20}
                    noOfSections={4}
                    maxValue={
                      Math.max(
                        item.approved,
                        item.underReview,
                        item.rejected
                      ) + 5
                    }
                    showValuesAsTopLabel
                    barBorderRadius={6}
                  />
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#A7F3D0" }]} />
            <Text>Approved</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#FDE68A" }]} />
            <Text>Under Review</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#FCA5A5" }]} />
            <Text>Rejected</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  header: {
    marginBottom: 10,
  },
  backIcon: {
    fontSize: 28,
    color: "#000000",
    fontWeight: "600",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 12,
    height: 12,
    marginRight: 6,
    borderRadius: 2,
  },
  dropdownContainer: {
    marginBottom: 12,
  },
  dropdownLabel: {
    fontSize: 14,
    marginBottom: 6,
    color: "#374151",
  },
  dropdownOptions: {
    flexDirection: "row",
    gap: 10,
  },
  dropdownOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    fontSize: 12,
  },
  activeOption: {
    backgroundColor: "#D1FAE5",
    color: "#065F46",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: "#A7F3D0",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },

  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  chartContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 14,
  },
});