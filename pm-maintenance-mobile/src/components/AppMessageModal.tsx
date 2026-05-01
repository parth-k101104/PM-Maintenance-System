import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AppMessageModalProps = {
  visible: boolean;
  type: "success" | "failure";
  title: string;
  message: string;
  primaryActionLabel?: string;
  onPrimaryAction: () => void;
};

export function AppMessageModal({
  visible,
  type,
  title,
  message,
  primaryActionLabel = "OK",
  onPrimaryAction,
}: AppMessageModalProps) {
  const isSuccess = type === "success";

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onPrimaryAction}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, isSuccess ? styles.successIconWrap : styles.failureIconWrap]}>
            <Ionicons
              name={isSuccess ? "checkmark-circle-outline" : "alert-circle-outline"}
              size={42}
              color={isSuccess ? "#167C16" : "#B42318"}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable
            style={[styles.actionButton, isSuccess ? styles.successButton : styles.failureButton]}
            onPress={onPrimaryAction}
          >
            <Text style={styles.actionText}>{primaryActionLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successIconWrap: {
    backgroundColor: "#E4F3E3",
  },
  failureIconWrap: {
    backgroundColor: "#FDE8E7",
  },
  title: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 23,
    lineHeight: 28,
    color: "#111111",
    textAlign: "center",
  },
  message: {
    fontFamily: "Jost_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: "#565B74",
    textAlign: "center",
    marginTop: 9,
  },
  actionButton: {
    width: "100%",
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  successButton: {
    backgroundColor: "#167C16",
  },
  failureButton: {
    backgroundColor: "#B42318",
  },
  actionText: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 17,
    color: "#FFFFFF",
  },
});
