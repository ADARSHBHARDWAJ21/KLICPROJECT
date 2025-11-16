import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PagerView from "react-native-pager-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { onboarding } from "../../constants";

const { width } = Dimensions.get("window");

export default function Welcome() {
  const pagerRef = useRef<PagerView>(null); // ✅ Correct ref type
  const [page, setPage] = useState(0);

  const handleNext = () => {
    if (page < onboarding.length - 1) {
      pagerRef.current?.setPage(page + 1);
    } else {
      router.replace("/(auth)/sign-in");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <PagerView
        style={styles.pager}
        initialPage={0}
        ref={pagerRef} // ✅ Pass correct ref
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
      >
        {onboarding.map((item, index) => (
          <View style={styles.page} key={index}>
            <ImageBackground
              source={item.image}
              resizeMode="cover"
              style={styles.background}
            >
              <View style={styles.overlay} />
              <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            </ImageBackground>
          </View>
        ))}
      </PagerView>

      <View style={styles.footer}>
        <View style={styles.dotsContainer}>
          {onboarding.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { opacity: page === index ? 1 : 0.3, width: page === index ? 24 : 8 },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextText}>
            {page === onboarding.length - 1 ? "Get Started" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  pager: {
    flex: 1,
  },
  page: {
    width,
    height: "100%",
  },
  background: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  textContainer: {
    paddingHorizontal: 30,
    paddingBottom: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#ddd",
    lineHeight: 22,
  },
  footer: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  dotsContainer: {
    flexDirection: "row",
    marginBottom: 15,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginHorizontal: 4,
  },
  nextButton: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 30,
  },
  nextText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 16,
  },
});
