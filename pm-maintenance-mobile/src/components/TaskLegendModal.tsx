import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function TaskLegendModal({ visible, onClose }: Props) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Legends & Guide</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={26} color="#111111" />
            </Pressable>
          </View>

          <Text style={styles.description}>
            Use this guide to understand how to read a task card on your dashboard.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Task Criticality (Left Stripe)</Text>
            <View style={styles.legendRow}>
              <View style={[styles.colorBox, { backgroundColor: "#8B0000" }]} />
              <Text style={styles.legendLabel}>High Priority</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.colorBox, { backgroundColor: "#B35900" }]} />
              <Text style={styles.legendLabel}>Medium Priority</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.colorBox, { backgroundColor: "#1E6545" }]} />
              <Text style={styles.legendLabel}>Low Priority</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Task Layout Elements</Text>
            <View style={styles.elementRow}>
              <View style={styles.leftLabel}>
                <Text style={styles.strongText}>PL101</Text>
              </View>
              <Text style={styles.legendLabelRow}>The Line Code indicating which machine line you are working on.</Text>
            </View>

            <View style={styles.elementRow}>
              <View style={styles.leftLabel}>
                <View style={styles.mockBadge}>
                  <Text style={styles.mockBadgeText}>Block A</Text>
                </View>
              </View>
              <Text style={styles.legendLabelRow}>The physical factory block where the machine is situated.</Text>
            </View>

            <View style={styles.elementRow}>
              <Text style={styles.legendLabel}>
                <Text style={styles.strongText}>Red text path </Text>(e.g. Drive Shaft &gt; Drive System) tells you the hierarchy of the parts you are maintaining.
              </Text>
            </View>
          </View>
          
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Got it!</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "88%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 22,
    color: "#111111",
  },
  description: {
    fontFamily: "Jost_400Regular",
    fontSize: 15,
    color: "#52525B",
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 16,
    color: "#111111",
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  colorBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
  },
  legendLabel: {
    fontFamily: "Jost_500Medium",
    fontSize: 15,
    color: "#3F3F46",
    lineHeight: 20,
  },
  legendLabelRow: {
    fontFamily: "Jost_500Medium",
    fontSize: 14,
    color: "#3F3F46",
    lineHeight: 18,
    flex: 1,
  },
  elementRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  leftLabel: {
    width: 76,
    marginRight: 10,
  },
  strongText: {
    fontFamily: "Jost_600SemiBold",
    color: "#111111",
  },
  mockBadge: {
    backgroundColor: "#111111",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  mockBadgeText: {
    fontFamily: "Jost_500Medium",
    color: "#FFFFFF",
    fontSize: 10,
  },
  closeButton: {
    backgroundColor: "#111111",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  closeButtonText: {
    fontFamily: "Jost_600SemiBold",
    color: "#FFFFFF",
    fontSize: 16,
  },
});
