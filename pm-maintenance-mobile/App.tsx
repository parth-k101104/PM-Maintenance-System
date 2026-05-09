import React from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Jost_400Regular, Jost_500Medium, Jost_600SemiBold } from "@expo-google-fonts/jost";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { SyncProvider } from "./src/context/SyncContext";
import { OfflineSyncStatus } from "./src/components/OfflineSyncStatus";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { QRScannerScreen } from "./src/screens/QRScannerScreen";
import { TaskApprovalScreen } from "./src/screens/TaskApprovalScreen";
import { TaskDocumentsScreen } from "./src/screens/TaskDocumentsScreen";
import { TaskExecutionScreen } from "./src/screens/TaskExecutionScreen";
import { TaskListScreen } from "./src/screens/TaskListScreen";
import { SupervisorDueApprovalsScreen } from "./src/screens/SupervisorDueApprovalsScreen";
import { LineManagerTodayApprovalsScreen } from "./src/screens/LineManagerTodayApprovalsScreen";
import { LineManagerBacklogApprovalsScreen } from "./src/screens/LineManagerBacklogApprovalsScreen";
import { LineManagerFlagsScreen } from "./src/screens/LineManagerFlagsScreen";
import { LineManagerEquipmentsScreen } from "./src/screens/LineManagerEquipmentsScreen";
import { LineManagerAnalyticsDashboardScreen } from "./src/screens/LineManagerAnalyticsDashboardScreen";
import { LineManagerPartAnalyticsScreen } from "./src/screens/LineManagerPartAnalyticsScreen";
import { SupervisorTaskReviewScreen } from "./src/screens/SupervisorTaskReviewScreen";
import { BacklogTasksScreen } from "./src/screens/BacklogTasksScreen";
import { UpcomingTasksScreen } from "./src/screens/UpcomingTasksScreen";
import { UpcomingApprovalsScreen } from "./src/screens/UpcomingApprovalsScreen";
import { FlagsRaisedScreen } from "./src/screens/FlagsRaisedScreen";
import { FlagDetailScreen } from "./src/screens/FlagDetailScreen";
import { LineManagerActiveTasksScreen } from "./src/screens/LineManagerActiveTasksScreen";
import { LineManagerFlagDetailScreen } from "./src/screens/LineManagerFlagDetailScreen";
import { SupervisorFlagsScreen } from "./src/screens/SupervisorFlagsScreen";
import { SupervisorFlagReviewScreen } from "./src/screens/SupervisorFlagReviewScreen";
import { colors } from "./src/theme/colors";
import { RootStackParamList } from "./src/types/navigation";
import EmployeeApprovalChartScreen from "src/screens/EmployeeApprovalChartScreen";
import { MaintenanceManagerDashboardScreen } from "./src/screens/MaintenanceManagerDashboardScreen";
import { MmTaskStatusListScreen } from "./src/screens/MmTaskStatusListScreen";
import { MmComplianceAnalyticsScreen } from "./src/screens/MmComplianceAnalyticsScreen";
import { MmEvidenceComplianceAnalyticsScreen } from "./src/screens/MmEvidenceComplianceAnalyticsScreen";
import { MmPhmCoverageAnalyticsScreen } from "./src/screens/MmPhmCoverageAnalyticsScreen";
import { MmEmployeeEfficiencyAnalyticsScreen } from "./src/screens/MmEmployeeEfficiencyAnalyticsScreen";
import { MmMetricTrendScreen } from "./src/screens/MmMetricTrendScreen";
import { ConfigParamsScreen } from "./src/screens/ConfigParamsScreen";
import { MaintenanceReportsScreen } from "./src/screens/MaintenanceReportsScreen";
import { SchedulePlannerScreen } from "./src/screens/SchedulePlannerScreen";
import { SchedulePlannerCreateScreen } from "./src/screens/SchedulePlannerCreateScreen";


const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { authState } = useAuth();

  if (authState.bootstrapping) {
    return (
      <SafeAreaView style={styles.bootContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!authState.session) {
    return (
      <>
        <LoginScreen />
        <OfflineSyncStatus />
      </>
    );
  }

  // Route maintenance managers directly to their dedicated screen
  if (authState.session.dashboardKind === "maintenanceManager") {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MaintenanceManagerDashboard" component={MaintenanceManagerDashboardScreen} />
          <Stack.Screen name="MaintenanceReports" component={MaintenanceReportsScreen} />
          <Stack.Screen name="SchedulePlanner" component={SchedulePlannerScreen} />
          <Stack.Screen name="SchedulePlannerCreate" component={SchedulePlannerCreateScreen} />
          <Stack.Screen name="MmTaskStatusList" component={MmTaskStatusListScreen} />
          <Stack.Screen name="MmComplianceAnalytics" component={MmComplianceAnalyticsScreen} />
          <Stack.Screen name="MmEvidenceComplianceAnalytics" component={MmEvidenceComplianceAnalyticsScreen} />
          <Stack.Screen name="MmPhmCoverageAnalytics" component={MmPhmCoverageAnalyticsScreen} />
          <Stack.Screen name="MmEmployeeEfficiencyAnalytics" component={MmEmployeeEfficiencyAnalyticsScreen} />
          <Stack.Screen name="MmMetricTrend" component={MmMetricTrendScreen} />
          <Stack.Screen name="LineManagerAnalyticsDashboard" component={LineManagerAnalyticsDashboardScreen} />
          <Stack.Screen name="LineManagerPartAnalytics" component={LineManagerPartAnalyticsScreen} />
          <Stack.Screen name="ConfigParams" component={ConfigParamsScreen} />
        </Stack.Navigator>
        <OfflineSyncStatus />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="TaskList" component={TaskListScreen} />
        <Stack.Screen name="SupervisorDueApprovals" component={SupervisorDueApprovalsScreen} />
        <Stack.Screen name="LineManagerTodayApprovals" component={LineManagerTodayApprovalsScreen} />
        <Stack.Screen name="LineManagerBacklogApprovals" component={LineManagerBacklogApprovalsScreen} />
        <Stack.Screen name="LineManagerFlags" component={LineManagerFlagsScreen} />
        <Stack.Screen name="LineManagerEquipments" component={LineManagerEquipmentsScreen} />
        <Stack.Screen name="SchedulePlanner" component={SchedulePlannerScreen} />
        <Stack.Screen name="SchedulePlannerCreate" component={SchedulePlannerCreateScreen} />
        <Stack.Screen name="LineManagerAnalyticsDashboard" component={LineManagerAnalyticsDashboardScreen} />
        <Stack.Screen name="LineManagerPartAnalytics" component={LineManagerPartAnalyticsScreen} />
        <Stack.Screen name="BacklogTasks" component={BacklogTasksScreen} />
        <Stack.Screen name="TaskApproval" component={TaskApprovalScreen} />
        <Stack.Screen name="UpcomingTasks" component={UpcomingTasksScreen} />
        <Stack.Screen name="UpcomingApprovals" component={UpcomingApprovalsScreen} />
        <Stack.Screen name="TaskDocuments" component={TaskDocumentsScreen} />
        <Stack.Screen name="QRScanner" component={QRScannerScreen} />
        <Stack.Screen name="TaskExecution" component={TaskExecutionScreen} />
        <Stack.Screen name="SupervisorTaskReview" component={SupervisorTaskReviewScreen} />
        <Stack.Screen name="EmployeeApprovalChart" component={EmployeeApprovalChartScreen} />
        <Stack.Screen name="FlagsRaised" component={FlagsRaisedScreen} />
        <Stack.Screen name="FlagDetail" component={FlagDetailScreen} />
        <Stack.Screen name="LineManagerActiveTasks" component={LineManagerActiveTasksScreen} />
        <Stack.Screen name="LineManagerFlagDetail" component={LineManagerFlagDetailScreen} />
        <Stack.Screen name="SupervisorFlags" component={SupervisorFlagsScreen} />
        <Stack.Screen name="SupervisorFlagReview" component={SupervisorFlagReviewScreen} />
        <Stack.Screen name="MmComplianceAnalytics" component={MmComplianceAnalyticsScreen} />
        <Stack.Screen name="MmEvidenceComplianceAnalytics" component={MmEvidenceComplianceAnalyticsScreen} />
        <Stack.Screen name="MmPhmCoverageAnalytics" component={MmPhmCoverageAnalyticsScreen} />
        <Stack.Screen name="MmEmployeeEfficiencyAnalytics" component={MmEmployeeEfficiencyAnalyticsScreen} />
        <Stack.Screen name="MmMetricTrend" component={MmMetricTrendScreen} />
        <Stack.Screen name="ConfigParams" component={ConfigParamsScreen} />
      </Stack.Navigator>
      <OfflineSyncStatus />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.bootContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SyncProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SyncProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bootContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
});
