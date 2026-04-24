import React from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Jost_400Regular, Jost_500Medium, Jost_600SemiBold } from "@expo-google-fonts/jost";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { QRScannerScreen } from "./src/screens/QRScannerScreen";
import { TaskApprovalScreen } from "./src/screens/TaskApprovalScreen";
import { TaskDocumentsScreen } from "./src/screens/TaskDocumentsScreen";
import { TaskExecutionScreen } from "./src/screens/TaskExecutionScreen";
import { TaskListScreen } from "./src/screens/TaskListScreen";
import { SupervisorDueApprovalsScreen } from "./src/screens/SupervisorDueApprovalsScreen";
import { SupervisorTaskReviewScreen } from "./src/screens/SupervisorTaskReviewScreen";
import { BacklogTasksScreen } from "./src/screens/BacklogTasksScreen";
import { UpcomingTasksScreen } from "./src/screens/UpcomingTasksScreen";
import { colors } from "./src/theme/colors";
import { RootStackParamList } from "./src/types/navigation";

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
    return <LoginScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="TaskList" component={TaskListScreen} />
        <Stack.Screen name="SupervisorDueApprovals" component={SupervisorDueApprovalsScreen} />
        <Stack.Screen name="BacklogTasks" component={BacklogTasksScreen} />
        <Stack.Screen name="TaskApproval" component={TaskApprovalScreen} />
        <Stack.Screen name="UpcomingTasks" component={UpcomingTasksScreen} />
        <Stack.Screen name="TaskDocuments" component={TaskDocumentsScreen} />
        <Stack.Screen name="QRScanner" component={QRScannerScreen} />
        <Stack.Screen name="TaskExecution" component={TaskExecutionScreen} />
        <Stack.Screen name="SupervisorTaskReview" component={SupervisorTaskReviewScreen} />
      </Stack.Navigator>
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
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
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
