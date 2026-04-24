import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

const LOGO_URL = "https://www.figma.com/api/mcp/asset/17b1620c-292b-435a-ae3d-e43e912fdb88";

export function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buttonDisabled = useMemo(
    () => !email.trim() || !password.trim() || submitting,
    [email, password, submitting],
  );
  const isLargeScreen = width >= 768;
  const contentWidth = Math.min(Math.max(width - 48, 320), isLargeScreen ? 480 : 420);
  const heroSize = Math.max(width * 1.35, 520);
  const heroTop = isLargeScreen ? -heroSize * 0.6 : -heroSize * 0.5;
  const heroLeft = (width - heroSize) / 2;
  const topSpacing = isLargeScreen ? 48 : Math.max(20, height * 0.04);

  async function handleLogin() {
    setSubmitting(true);
    setError(null);

    try {
      await signIn({ email: email.trim(), password, rememberMe });
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Unable to sign in";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.heroArc,
          {
            width: heroSize,
            height: heroSize * 0.76,
            borderRadius: heroSize / 2,
            top: heroTop,
            left: heroLeft,
          },
        ]}
      />

      <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <View style={[styles.container, { width: contentWidth }]}>
          <Image source={{ uri: LOGO_URL }} style={[styles.logo, isLargeScreen && styles.logoLarge]} resizeMode="contain" />

          <View style={styles.personIcon}>
            <Ionicons name="person-outline" size={isLargeScreen ? 42 : 34} color={colors.text} />
            <View style={styles.gearBadge}>
              <Ionicons name="settings-outline" size={isLargeScreen ? 22 : 18} color={colors.text} />
            </View>
          </View>

          <Text style={[styles.title, isLargeScreen && styles.titleLarge]}>
            Preventive & Predictive{"\n"}maintenance system
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, isLargeScreen && styles.labelLarge]}>E-Mail ID</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="@company.com"
              placeholderTextColor={colors.textSoft}
              style={[styles.input, isLargeScreen && styles.inputLarge]}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, isLargeScreen && styles.labelLarge]}>Password</Text>
            <View style={[styles.passwordWrap, isLargeScreen && styles.inputLarge]}>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                placeholder=""
                placeholderTextColor={colors.textSoft}
                secureTextEntry={secureTextEntry}
                style={[styles.passwordInput, isLargeScreen && styles.passwordInputLarge]}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setSecureTextEntry((current) => !current)} hitSlop={8}>
                <Ionicons
                  name={secureTextEntry ? "eye-off-outline" : "eye-outline"}
                  size={isLargeScreen ? 28 : 24}
                  color={colors.textSoft}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            disabled={buttonDisabled}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.loginButton,
              isLargeScreen && styles.loginButtonLarge,
              buttonDisabled && styles.loginButtonDisabled,
              pressed && !buttonDisabled && styles.loginButtonPressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={[styles.loginButtonText, isLargeScreen && styles.loginButtonTextLarge]}>Log in</Text>
            )}
          </Pressable>

          <View style={styles.rememberRow}>
            <Switch
              trackColor={{ false: "#D7D6E2", true: "#A9AFD9" }}
              thumbColor={rememberMe ? colors.primary : colors.surface}
              value={rememberMe}
              onValueChange={setRememberMe}
            />
            <Text style={[styles.rememberText, isLargeScreen && styles.rememberTextLarge]}>Remember me</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </View>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  heroArc: {
    position: "absolute",
    backgroundColor: colors.primarySoft,
  },
  scrollContent: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 24,
  },
  logo: {
    width: 155,
    height: 155,
    alignSelf: "center",
    marginBottom: 28,
  },
  logoLarge: {
    width: 148,
    height: 148,
    marginBottom: 64,
  },
  personIcon: {
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    width: 75,
    height: 75,
    borderRadius: 33,
    marginBottom: 10,
  },
  gearBadge: {
    position: "absolute",
    right: 4,
    bottom: 6,
  },
  title: {
    textAlign: "center",
    fontFamily: "Jost_500Medium",
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
    letterSpacing: 0.8,
    marginBottom: 50,
  },
  titleLarge: {
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 48,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontFamily: "Jost_400Regular",
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
    letterSpacing: 0.64,
  },
  labelLarge: {
    fontSize: 18,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    paddingHorizontal: 16,
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    color: colors.text,
  },
  inputLarge: {
    height: 52,
    borderRadius: 18,
    fontSize: 15,
  },
  passwordWrap: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    color: colors.text,
  },
  passwordInputLarge: {
    fontSize: 15,
  },
  loginButton: {
    height: 46,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  loginButtonLarge: {
    height: 54,
    borderRadius: 12,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonPressed: {
    opacity: 0.92,
  },
  loginButtonText: {
    fontFamily: "Jost_500Medium",
    fontSize: 20,
    color: colors.surface,
    letterSpacing: 0.8,
  },
  loginButtonTextLarge: {
    fontSize: 22,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    gap: 8,
  },
  rememberText: {
    fontFamily: "Jost_400Regular",
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.48,
  },
  rememberTextLarge: {
    fontSize: 14,
  },
  errorText: {
    marginTop: 14,
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    color: colors.danger,
  },
});
