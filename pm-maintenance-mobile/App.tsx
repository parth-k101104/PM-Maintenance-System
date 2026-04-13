import React from "react";
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, View } from "react-native";
import { useFonts, Jost_400Regular, Jost_500Medium, Jost_600SemiBold } from "@expo-google-fonts/jost";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { colors } from "./src/theme/colors";

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

  return authState.session ? <DashboardScreen /> : <LoginScreen />;
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
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
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
