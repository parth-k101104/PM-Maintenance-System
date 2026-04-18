import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { RootStackParamList } from "../types/navigation";

const drawerItems = [
  "Dashboard",
  "Plant layout",
  "Machine manuals",
  "Backlogs",
  "Flags raised",
  "Raise issue",
  "Profile",
];

function formatGreeting(shift?: string) {
  const normalized = shift?.toLowerCase() ?? "";

  if (normalized.includes("night")) {
    return "Good Evening";
  }

  if (normalized.includes("afternoon")) {
    return "Good Afternoon";
  }

  return "Good Morning";
}

function formatItems(items?: { itemName: string; quantity: number }[]) {
  if (!items?.length) {
    return ["No items assigned yet"];
  }

  return items.map((item) => (item.quantity > 1 ? `${item.itemName} x${item.quantity}` : item.itemName));
}

export function DashboardScreen() {
  const { width } = useWindowDimensions();
  const { authState, signOut, refreshDashboard } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const session = authState.session;
  const dashboard = session?.dashboard;

  // Stable ref so the useFocusEffect callback always calls the latest
  // refreshDashboard without it being a reactive dependency.
  const refreshRef = useRef(refreshDashboard);
  refreshRef.current = refreshDashboard;

  // Empty dependency array → runs exactly ONCE per screen focus event.
  // No infinite loop because we never depend on the refreshDashboard identity.
  useFocusEffect(
    useCallback(() => {
      refreshRef.current();
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );
  const greeting = formatGreeting(dashboard?.userContext.shift);
  const userName = dashboard?.userContext.name || session?.fullName || "user";
  const items = useMemo(() => formatItems(dashboard?.requiredItems), [dashboard?.requiredItems]);
  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? 40 : 18;
  const contentMaxWidth = isTablet ? 920 : 560;
  const drawerWidth = Math.min(width * 0.78, 360);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentInner, { maxWidth: contentMaxWidth }]}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} style={styles.headerIcon}>
                <Ionicons name="menu-outline" size={isTablet ? 40 : 34} color="#525252" />
              </Pressable>

              <View style={styles.profileIcon}>
                <Ionicons name="person-circle-outline" size={isTablet ? 64 : 56} color="#676767" />
              </View>
            </View>

            <Text style={[styles.greetingText, isTablet && styles.greetingTextTablet]}>
              {greeting} {userName}
            </Text>

            <View style={styles.cardsWrapper}>
              <View style={styles.cardsRow}>
                <Pressable 
                  style={[styles.card, styles.todayCard, styles.flexLarge]}
                  onPress={() => navigation.navigate("TaskList")}
                >
                  <Text style={styles.cardTitle}>Tasks for today-</Text>
                  <Text style={styles.bigNumber}>{dashboard?.taskSummary.tasksToday ?? 0}</Text>
                  <Text style={styles.cardFootnote}>remaining</Text>
                  <Ionicons name="arrow-forward-outline" size={40} color="#111111" style={styles.cardArrow} />
                </Pressable>

                <View style={[styles.card, styles.backlogCard, styles.flexSmall]}>
                  <Text style={styles.cardTitleSmall}>Tasks on{"\n"}backlog-</Text>
                  <Text style={styles.mediumNumber}>{dashboard?.taskSummary.backlogTasks ?? 0}</Text>
                  <Ionicons
                    name="arrow-forward-outline"
                    size={38}
                    color="#111111"
                    style={styles.smallCardArrow}
                  />
                </View>
              </View>

              <View style={styles.cardsRow}>
                <Pressable 
                  style={[styles.card, styles.statusCard, styles.flexSmall]}
                  onPress={() => navigation.navigate("TaskApproval")}
                >
                  <Text style={styles.statusTitle}>Tasks status-</Text>
                  <Text style={styles.statusLine}>
                    Approved-<Text style={styles.approvedText}>{dashboard?.taskStatus.approved ?? 0}</Text>
                  </Text>
                  <Text style={styles.statusLine}>
                    Pending-<Text style={styles.pendingText}>{dashboard?.taskStatus.pending ?? 0}</Text>
                  </Text>
                  <Text style={styles.statusLine}>
                    Denied-<Text style={styles.deniedText}>{dashboard?.taskStatus.denied ?? 0}</Text>
                  </Text>
                  <Ionicons name="arrow-forward-outline" size={34} color="#111111" style={styles.statusArrow} />
                </Pressable>

                <Pressable 
                  style={[styles.card, styles.otherTasksCard, styles.flexLarge]}
                  onPress={() => navigation.navigate("UpcomingTasks")}
                >
                  <Text style={styles.cardTitle}>Other tasks-</Text>
                  <Text style={styles.bigNumber}>{dashboard?.taskSummary.remainingTasks ?? 0}</Text>
                  <Text style={styles.cardFootnoteAlt}>Till month end</Text>
                  <Ionicons
                    name="arrow-forward-outline"
                    size={40}
                    color="#111111"
                    style={styles.otherCardArrow}
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.timeCard}>
              <Text style={styles.timeCardTitle}>Total time required to finish today&apos;s tasks-</Text>
              <Text style={styles.timeCardValue}>{dashboard?.timeEstimate.formattedEstimate ?? "0 mins"}</Text>
            </View>

            <View style={styles.itemsSection}>
              <Text style={styles.itemsHeading}>Items require to attend today&apos;s tasks-</Text>
              {items.map((item) => (
                <Text key={item} style={styles.itemBullet}>
                  .  {item}
                </Text>
              ))}
            </View>

            <Pressable 
              style={[styles.primaryButton, isTablet && styles.primaryButtonTablet]}
              onPress={() => navigation.navigate("TaskList")}
            >
              <Text style={styles.primaryButtonText}>Let&apos;s Start!</Text>
            </Pressable>
          </View>
        </ScrollView>

        <Modal animationType="fade" transparent visible={menuOpen} onRequestClose={() => setMenuOpen(false)}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalOverlay} onPress={() => setMenuOpen(false)} />

            <View style={[styles.drawer, { width: drawerWidth }]}>
              <Pressable style={styles.drawerHeader} onPress={() => setMenuOpen(false)}>
                <Ionicons name="arrow-back-outline" size={34} color="#111111" />
                <Text style={styles.drawerHeaderText}>Menu</Text>
              </Pressable>

              <View style={styles.drawerItems}>
                {drawerItems.map((item) => (
                  <Text key={item} style={styles.drawerItemText}>
                    {item}
                  </Text>
                ))}
              </View>

              <View style={styles.drawerFooter}>
                <Pressable
                  onPress={signOut}
                  style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
                >
                  <Text style={styles.logoutText}>Log out</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 26,
    paddingBottom: 40,
    alignItems: "center",
  },
  contentInner: {
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 42,
    paddingHorizontal: 6,
  },
  headerIcon: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  profileIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingText: {
    fontFamily: "Jost_500Medium",
    fontSize: 26,
    lineHeight: 30,
    color: "#111111",
    marginBottom: 28,
    paddingHorizontal: 36,
  },
  greetingTextTablet: {
    fontSize: 34,
    lineHeight: 38,
  },
  cardsWrapper: {
    gap: 16,
    marginBottom: 24,
    width: "100%",
  },
  cardsRow: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  flexLarge: {
    flex: 1.6,
  },
  flexSmall: {
    flex: 1,
  },
  card: {
    borderRadius: 30,
    position: "relative",
    overflow: "hidden",
  },
  todayCard: {
    backgroundColor: "#CFD1E0",
    minHeight: 192,
    paddingTop: 26,
    paddingHorizontal: 30,
    paddingBottom: 24,
  },
  backlogCard: {
    backgroundColor: "#FDE3C5",
    minHeight: 192,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  statusCard: {
    backgroundColor: "#D2E0D1",
    minHeight: 214,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  otherTasksCard: {
    backgroundColor: "#FBF794",
    minHeight: 214,
    paddingTop: 28,
    paddingHorizontal: 26,
    paddingBottom: 24,
  },
  cardTitle: {
    fontFamily: "Jost_500Medium",
    fontSize: 20,
    lineHeight: 26,
    color: "#111111",
    marginBottom: 16,
  },
  cardTitleSmall: {
    fontFamily: "Jost_500Medium",
    fontSize: 16,
    lineHeight: 20,
    color: "#111111",
    marginBottom: 20,
  },
  bigNumber: {
    fontFamily: "Jost_500Medium",
    fontSize: 60,
    lineHeight: 62,
    color: "#000000",
  },
  mediumNumber: {
    fontFamily: "Jost_500Medium",
    fontSize: 64,
    lineHeight: 66,
    color: "#000000",
    marginTop: 8,
  },
  cardFootnote: {
    fontFamily: "Jost_400Regular",
    fontSize: 16,
    lineHeight: 18,
    color: "#111111",
  },
  cardFootnoteAlt: {
    fontFamily: "Jost_400Regular",
    fontSize: 16,
    lineHeight: 18,
    color: "#111111",
    marginTop: 4,
  },
  cardArrow: {
    position: "absolute",
    right: 26,
    bottom: 20,
  },
  smallCardArrow: {
    position: "absolute",
    right: 18,
    bottom: 20,
  },
  otherCardArrow: {
    position: "absolute",
    right: 22,
    bottom: 20,
  },
  statusTitle: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    lineHeight: 18,
    color: "#111111",
    marginBottom: 18,
  },
  statusLine: {
    fontFamily: "Jost_400Regular",
    fontSize: 16,
    lineHeight: 20,
    color: "#111111",
    marginBottom: 8,
  },
  approvedText: {
    color: "#165A15",
    fontFamily: "Jost_600SemiBold",
  },
  pendingText: {
    color: "#A29200",
    fontFamily: "Jost_600SemiBold",
  },
  deniedText: {
    color: "#9B1B1B",
    fontFamily: "Jost_600SemiBold",
  },
  statusArrow: {
    position: "absolute",
    right: 16,
    bottom: 18,
  },
  timeCard: {
    width: "100%",
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 18,
    marginBottom: 42,
  },
  timeCardTitle: {
    fontFamily: "Jost_500Medium",
    fontSize: 21,
    lineHeight: 26,
    color: "#111111",
    textAlign: "center",
    marginBottom: 10,
  },
  timeCardValue: {
    fontFamily: "Jost_500Medium",
    fontSize: 50,
    lineHeight: 54,
    color: "#167C16",
    textAlign: "center",
  },
  itemsSection: {
    width: "100%",
    paddingHorizontal: 22,
    marginBottom: 60,
  },
  itemsHeading: {
    fontFamily: "Jost_500Medium",
    fontSize: 21,
    lineHeight: 26,
    color: "#111111",
    marginBottom: 30,
  },
  itemBullet: {
    fontFamily: "Jost_400Regular",
    fontSize: 18,
    lineHeight: 28,
    color: "#111111",
    marginBottom: 2,
  },
  primaryButton: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 340,
    height: 66,
    borderRadius: 16,
    backgroundColor: "#131010",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonTablet: {
    maxWidth: 420,
  },
  primaryButtonText: {
    fontFamily: "Jost_500Medium",
    fontSize: 24,
    lineHeight: 28,
    color: "#FFFFFF",
  },
  modalRoot: {
    flex: 1,
    flexDirection: "row",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#C7C9E8",
    borderTopRightRadius: 60,
    borderBottomRightRadius: 60,
    paddingTop: 72,
    paddingHorizontal: 28,
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 4, height: 0 },
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 60,
  },
  drawerHeaderText: {
    marginLeft: 18,
    fontFamily: "Jost_500Medium",
    fontSize: 26,
    lineHeight: 30,
    color: "#111111",
  },
  drawerItems: {
    paddingLeft: 20,
    gap: 36,
  },
  drawerItemText: {
    fontFamily: "Jost_400Regular",
    fontSize: 22,
    lineHeight: 26,
    color: "#2F2F2F",
  },
  drawerFooter: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 80,
    width: "100%",
  },
  logoutButton: {
    width: "90%",
    maxWidth: 260,
    height: 68,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logoutButtonPressed: {
    opacity: 0.88,
  },
  logoutText: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 22,
    lineHeight: 26,
    color: "#A12E2E",
  },
});
