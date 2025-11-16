import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Settings() {
  const profileSection = [
    { 
      title: "Profile", 
      icon: "person-circle-outline", 
      path: "../setting/prrofile",
      type: "profile"
    },
    { 
      title: "Business Account", 
      icon: "business-outline", 
      path: "../setting/business",
      type: "business"
    },
  ];

  const menuItems = [
  
    { title: "Planning", icon: "diamond-outline", path: "/planning" },
    { title: "Write a Review", icon: "create-outline", path: "/review" },
    { title: "Genie Recommendations", icon: "bulb-outline", path: "/genie" },
    { title: "Contact Support", icon: "call-outline", path: "/support" },
    { title: "Information", icon: "document-text-outline", path: "/info" },
    { title: "Rate on Play Store", icon: "star-outline", path: "/rate" },
    { title: "Share App", icon: "share-outline", path: "/share" },
  ];

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.item, 
        item.type === 'profile' && styles.profileItem,
        item.type === 'business' && styles.businessItem
      ]} 
      onPress={() => router.push(item.path)}
    >
      <Ionicons 
        name={item.icon} 
        size={item.type ? 26 : 22} 
        color={item.type ? "#444" : "#555"} 
        style={{ marginRight: 15 }} 
      />
      <Text style={[
        styles.itemText,
        item.type && styles.bigItemText
      ]}>
        {item.title}
      </Text>
      {item.type && (
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color="#888" 
          style={styles.chevron} 
        />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Profile and Business Sections */}
      <View style={styles.topSection}>
        {profileSection.map((item) => (
          <React.Fragment key={item.title}>
            {renderItem({ item })}
            <View style={styles.sectionSeparator} />
          </React.Fragment>
        ))}
      </View>
      
      {/* Regular Menu Items */}
      <FlatList
        data={menuItems}
        scrollEnabled={false}
        keyExtractor={(item) => item.title}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    marginTop: 40,
    flex: 1, 
    backgroundColor: "#f8f9fa", 
  },
  topSection: {
    backgroundColor: "#fff",
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  profileItem: {
    paddingVertical: 22,
    backgroundColor: "#fff",
  },
  businessItem: {
    paddingVertical: 22,
    backgroundColor: "#fff",
  },
  itemText: { 
    fontSize: 16, 
    color: "#333",
    flex: 1,
  },
  bigItemText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#222",
  },
  separator: { 
    height: 1, 
    backgroundColor: "#eee", 
    marginLeft: 58,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 20,
  },
  chevron: {
    marginLeft: 10,
  },
});