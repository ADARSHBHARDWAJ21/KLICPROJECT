// app/(auth)/PhoneAuthScreen.tsx
import { useSignIn } from "@clerk/clerk-expo";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, Text, TextInput, View, StyleSheet, TouchableOpacity } from "react-native";

export default function PhoneAuthScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOTP = async () => {
    if (!isLoaded) return;

    try {
      setLoading(true);
      const result = await signIn.create({
        identifier: phoneNumber,
      });

      if (result.status === "needs_first_factor") {
        await signIn.prepareFirstFactor({
          strategy: "phone_code",
        });
        setPendingVerification(true);
        setMsg("OTP sent successfully! Check your phone.");
        Alert.alert("OTP Sent", "Please check your phone for the verification code.");
      } else {
        setMsg("Failed to send OTP");
      }
    } catch (e: any) {
      console.log(e);
      const errorMsg = e.errors?.[0]?.message || "Failed to send OTP";
      setMsg(errorMsg);
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!isLoaded) return;

    try {
      setLoading(true);
      const result = await signIn.attemptFirstFactor({
        strategy: "phone_code",
        code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)/home");
      } else {
        setMsg("Verification incomplete");
        Alert.alert("Error", "Verification incomplete. Please try again.");
      }
    } catch (e: any) {
      const errorMsg = e.errors?.[0]?.message || "Invalid OTP";
      setMsg(errorMsg);
      Alert.alert("Verification Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!isLoaded) return;
    try {
      setLoading(true);
      await signIn.prepareFirstFactor({
        strategy: "phone_code",
      });
      Alert.alert("OTP Resent", "A new verification code has been sent to your phone.");
    } catch (e: any) {
      Alert.alert("Error", e.errors?.[0]?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phone Authentication</Text>

      {!pendingVerification ? (
        <>
          <Text style={styles.subtitle}>Enter your phone number to receive an OTP</Text>
          <TextInput
            placeholder="+91 9876543210"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <Button
            title={loading ? "Sending OTP..." : "Send OTP"}
            onPress={sendOTP}
            disabled={!phoneNumber || loading}
          />
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>Enter the code sent to {phoneNumber}</Text>
          <TextInput
            placeholder="Enter OTP"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            style={styles.input}
            maxLength={6}
          />
          <Button
            title={loading ? "Verifying..." : "Verify OTP"}
            onPress={verifyOTP}
            disabled={!code || code.length !== 6 || loading}
          />
          <TouchableOpacity onPress={handleResendOTP} style={styles.resendButton}>
            <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setPendingVerification(false);
              setCode("");
              setMsg("");
            }}
            style={styles.backButton}
          >
            <Text style={styles.backText}>Change Phone Number</Text>
          </TouchableOpacity>
        </>
      )}

      {msg ? <Text style={styles.message}>{msg}</Text> : null}

      <View style={styles.footer}>
        <Button title="Back to Sign In" onPress={() => router.replace("./sign-in")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    borderColor: "#ddd",
  },
  message: {
    marginTop: 15,
    color: "#666",
    textAlign: "center",
  },
  resendButton: {
    marginTop: 15,
    padding: 10,
  },
  resendText: {
    color: "#007AFF",
    textAlign: "center",
  },
  backButton: {
    marginTop: 10,
    padding: 10,
  },
  backText: {
    color: "#666",
    textAlign: "center",
  },
  footer: {
    marginTop: 30,
  },
});
