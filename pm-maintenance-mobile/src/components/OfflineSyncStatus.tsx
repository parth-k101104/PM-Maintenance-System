import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSync } from "../context/SyncContext";
import { colors } from "../theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const OfflineSyncStatus: React.FC = () => {
  const { isOffline, queue, syncNow, isSyncing } = useSync();
  const insets = useSafeAreaInsets();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Show if offline OR if there are pending items
    if (isOffline || queue.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOffline, queue.length]);

  const handlePress = () => {
    if (!isOffline && queue.length > 0) {
      syncNow();
    }
  };

  if (!isOffline && queue.length === 0 && !isSyncing) return null;

  return (
    <Animated.View 
      style={[
        styles.floatingContainer, 
        { top: insets.top + 10, opacity: fadeAnim }
      ]}
    >
      <Pressable 
        style={({ pressed }) => [
          styles.iconCircle, 
          isOffline ? styles.offlineCircle : styles.pendingCircle,
          pressed && styles.pressed
        ]}
        onPress={handlePress}
        disabled={isOffline || isSyncing}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons 
            name={isOffline ? "cloud-offline" : "cloud-upload"} 
            size={22} 
            color="#FFFFFF" 
          />
        )}
        
        {!isOffline && queue.length > 0 && !isSyncing && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{queue.length}</Text>
          </View>
        )}
      </Pressable>
      
      {!isOffline && queue.length > 0 && !isSyncing && (
        <View style={styles.labelContainer}>
           <Text style={styles.labelText}>Sync Now</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    right: 16,
    zIndex: 10000,
    alignItems: "center",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  offlineCircle: {
    backgroundColor: "#DC2626", // Red
  },
  pendingCircle: {
    backgroundColor: "#059669", // Green
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#111111",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Jost_600SemiBold",
  },
  labelContainer: {
    marginTop: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labelText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Jost_500Medium",
  },
});
