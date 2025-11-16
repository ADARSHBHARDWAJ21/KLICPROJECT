import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Keeping EVENTS untouched as per your request
const EVENTS = {
  wedding: {
    title: 'Wedding',
    tasks: [
      'Set wedding date',
      'Create guest list',
      'Choose venue',
      'Book venue',
      'Hire wedding planner (optional)',
      'Select caterer and menu',
      'Taste test with caterer',
      'Book photographer & videographer',
      'Select decorators & floral designer',
      'Book makeup & hair artists',
      'Arrange music / DJ / band',
      'Arrange transportation (cars/buses)',
      'Arrange accommodation for guests',
      'Design & send invitations',
      'Create seating plan',
      'Order wedding cake',
      'Arrange wedding outfits (bride/groom/bridesmaids)',
      'Legal paperwork / marriage license',
      'Arrange gifts / return gifts',
      'Book officiant',
      'Plan ceremony timeline',
      'Plan reception timeline',
      'Plan rehearsals',
      'Create emergency kit (safety pins, meds)',
      'Arrange security & crowd control',
      'Arrange lighting & AV',
      'Create honeymoon plans',
      'Finalize budget & payment schedule',
    ],
  },
  birthday: {
    title: 'Birthday Party',
    tasks: [
      'Set date & time',
      'Choose theme',
      'Create guest list',
      'Book venue (if needed)',
      'Arrange invitations',
      'Order cake',
      'Arrange caterer or snacks',
      'Book photographer',
      'Arrange decorations',
      'Book entertainment (magician/DJ)',
      'Arrange games & prizes',
      'Prepare party favors',
      'Arrange seating',
      'Arrange sound & lights',
      'Confirm RSVPs',
      'Create timeline / schedule',
      'Arrange parking / transport',
      'Prepare thank you notes',
    ],
  },
  function: {
    title: 'Function Event',
    tasks: [
      'Define event objective',
      'Set date & time',
      'Create attendee list',
      'Choose venue',
      'Book venue',
      'Arrange AV & stage',
      'Arrange seating & layout',
      'Book speakers / hosts',
      'Arrange catering',
      'Arrange registration desk',
      'Prepare printed materials',
      'Arrange name badges',
      'Organize transport & parking',
      'Plan event promotion',
      'Hire security / ushers',
      'Run-through / rehearsal',
      'Prepare contingency plan',
      'Finalize budget',
    ],
  },
  anniversary: {
    title: 'Anniversary',
    tasks: [
      'Choose date & venue',
      'Create guest list',
      'Decide surprise / theme',
      'Arrange catering',
      'Order cake',
      'Arrange decorations',
      'Book photographer',
      'Book music / band',
      'Prepare anniversary tributes',
      'Arrange seating',
      'Arrange transport / parking',
      'Create timeline',
      'Plan gift or memory book',
    ],
  },
};

export default function EventPlannerApp() {
  const router = useRouter();

  const [selectedEventKey, setSelectedEventKey] = useState('wedding');
  const [tasksState, setTasksState] = useState({});
  const [customTaskText, setCustomTaskText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalTask, setDetailsModalTask] = useState(null);
  const [showCustomTaskInput, setShowCustomTaskInput] = useState(false);

  useEffect(() => {
    const initial = {};
    Object.keys(EVENTS).forEach((key) => {
      initial[key] = EVENTS[key].tasks.map((t, i) => ({ id: `${key}-${i}`, text: t, done: false }));
    });
    setTasksState(initial);
  }, []);

  function toggleTaskDone(eventKey, taskId) {
    setTasksState((prev) => {
      const list = prev[eventKey].map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
      return { ...prev, [eventKey]: list };
    });
  }

  function addCustomTask() {
    if (!customTaskText.trim()) {
      setShowCustomTaskInput(false);
      return;
    }
    setTasksState((prev) => {
      const newTask = { id: `${selectedEventKey}-custom-${Date.now()}`, text: customTaskText.trim(), done: false };
      return { ...prev, [selectedEventKey]: [...prev[selectedEventKey], newTask] };
    });
    setCustomTaskText('');
    setShowCustomTaskInput(false);
  }

  function openVendorBrowse() {
    router.push({ pathname: '/vendorBrowse', params: { event: selectedEventKey } });
  }

  const currentTasks = tasksState[selectedEventKey] || [];
  const completedCount = currentTasks.filter((t) => t.done).length;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a0f07', '#2c1a0f', '#1a0f07']}
        style={styles.backgroundGradient}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#C19A6B', '#8B4513']}
          style={styles.headerGradient}
        >
          <Text style={styles.title}>✨ Event Planner</Text>
          <Text style={styles.subtitle}>Luxury checklists for every occasion</Text>
        </LinearGradient>
      </View>

      {/* Event Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Event</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventList}>
          {Object.keys(EVENTS).map((key) => {
            const active = key === selectedEventKey;
            return (
              <TouchableOpacity key={key} onPress={() => setSelectedEventKey(key)}>
                <LinearGradient
                  colors={active ? ['#C19A6B', '#8B4513'] : ['#2c1a0f', '#3d2815']}
                  style={[styles.eventPill, active && styles.eventPillActive]}
                >
                  <Text style={[styles.eventPillText, active && styles.eventPillTextActive]}>{EVENTS[key].title}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Checklist Summary */}
      <LinearGradient
        colors={['#2c1a0f', '#3d2815', '#2c1a0f']}
        style={styles.card}
      >
        <View style={styles.cardContent}>
          <View>
            <Text style={styles.checklistTitle}>{EVENTS[selectedEventKey].title} Checklist</Text>
            <Text style={styles.checklistSubtitle}>{completedCount} of {currentTasks.length} tasks done</Text>
          </View>
          <TouchableOpacity onPress={() => {
            setTasksState((prev) => ({
              ...prev,
              [selectedEventKey]: EVENTS[selectedEventKey].tasks.map((t, i) => ({ id: `${selectedEventKey}-${i}`, text: t, done: false }))
            }));
          }} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Task List */}
      <View style={styles.taskListContainer}>
        <FlatList
          data={currentTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.taskRow}>
              <TouchableOpacity onPress={() => toggleTaskDone(selectedEventKey, item.id)} style={styles.taskLeft}>
                <View style={[styles.checkBox, item.done && styles.checkBoxDone]}>
                  {item.done && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={[styles.taskText, item.done && styles.taskTextDone]}>{item.text}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setDetailsModalTask(item); setModalVisible(true); }} style={styles.detailBtn}>
                <Text style={styles.detailBtnText}>Details</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.taskList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Add Custom Task */}
      <View style={styles.customTaskSection}>
        {!showCustomTaskInput ? (
          <TouchableOpacity 
            onPress={() => setShowCustomTaskInput(true)} 
            style={styles.addCustomTaskButton}
          >
            <LinearGradient
              colors={['#C19A6B', '#8B4513']}
              style={styles.addCustomTaskGradient}
            >
              <Text style={styles.addCustomTaskText}>+ Add Custom Task</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.customTaskInputContainer}>
            <TextInput 
              placeholder="Enter a new task" 
              placeholderTextColor="#A67B5B"
              value={customTaskText} 
              onChangeText={setCustomTaskText} 
              style={styles.input} 
              autoFocus
            />
            <View style={styles.customTaskActions}>
              <TouchableOpacity onPress={() => setShowCustomTaskInput(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addCustomTask} style={styles.confirmBtn}>
                <LinearGradient
                  colors={['#C19A6B', '#8B4513']}
                  style={styles.confirmBtnGradient}
                >
                  <Text style={styles.confirmBtnText}>Add Task</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Task Details Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1a0f07', '#2c1a0f']}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Task Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {detailsModalTask && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalTaskTitle}>{detailsModalTask.text}</Text>
                <View style={styles.tipContainer}>
                  <Text style={styles.tipTitle}>Tips:</Text>
                  <Text style={styles.tip}>• Break into smaller steps</Text>
                  <Text style={styles.tip}>• Allocate budget</Text>
                  <Text style={styles.tip}>• Confirm availability & contracts</Text>
                  <Text style={styles.tip}>• Set deadlines for each sub-task</Text>
                  <Text style={styles.tip}>• Research multiple options before deciding</Text>
                </View>
                <TouchableOpacity onPress={() => { setModalVisible(false); router.push({ pathname: '/vendorBrowse', params: { event: selectedEventKey, task: detailsModalTask.text } }); }} style={styles.modalVendorBtn}>
                  <LinearGradient
                    colors={['#C19A6B', '#8B4513']}
                    style={styles.modalVendorBtnGradient}
                  >
                    <Text style={styles.modalVendorBtnText}>Find Vendors</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            )}
          </LinearGradient>
        </View>
      </Modal>
    </SafeAreaView>
  );
}const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#1a0f07',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 30,
  },
  headerGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  title: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#fff', 
    marginBottom: 4,
  },
  subtitle: { 
    fontSize: 14, 
    color: '#f0e6d8',
    fontWeight: '500',
  },

  section: { 
    marginBottom: 16, 
    paddingHorizontal: 16,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#f0e6d8', 
    marginBottom: 8,
  },

  eventList: { 
    paddingBottom: 4,
  },
  eventPill: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    marginRight: 8,
  },
  eventPillText: { 
    color: '#d4b896', 
    fontWeight: '600',
    fontSize: 12,
  },
  eventPillTextActive: { 
    color: '#fff', 
    fontWeight: '700',
  },

  card: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  checklistTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#fff',
    marginBottom: 2,
  },
  checklistSubtitle: { 
    fontSize: 12, 
    color: '#d4b896',
    fontWeight: '500',
  },
  resetBtn: { 
    backgroundColor: 'rgba(193, 154, 107, 0.2)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C19A6B',
  },
  resetBtnText: { 
    color: '#d4b896', 
    fontWeight: '600',
    fontSize: 12,
  },

  taskListContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  taskList: { 
    padding: 2,
    paddingBottom: 16,
  },
  taskRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#3d2815',
  },
  taskLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1,
    paddingRight: 8,
  },
  checkBox: { 
    width: 20, 
    height: 20, 
    borderWidth: 2, 
    borderColor: '#8B4513', 
    marginRight: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 4,
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
  },
  checkBoxDone: { 
    backgroundColor: '#8B4513', 
    borderColor: '#8B4513',
  },
  checkMark: { 
    color: 'white', 
    fontWeight: 'bold',
    fontSize: 12,
  },
  taskText: { 
    fontSize: 14, 
    color: '#f0e6d8', 
    flex: 1,
    lineHeight: 20,
  },
  taskTextDone: { 
    textDecorationLine: 'line-through', 
    color: '#A67B5B',
  },
  detailBtn: { 
    backgroundColor: 'rgba(193, 154, 107, 0.2)', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 6, 
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#C19A6B',
  },
  detailBtnText: { 
    color: '#d4b896', 
    fontWeight: '600',
    fontSize: 11,
  },

  customTaskSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  addCustomTaskButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  addCustomTaskGradient: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  addCustomTaskText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  customTaskInputContainer: {
    backgroundColor: 'rgba(44, 26, 15, 0.8)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#8B4513', 
    padding: 10, 
    borderRadius: 6, 
    marginBottom: 8, 
    fontSize: 14, 
    color: '#fff',
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
  },
  customTaskActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(139, 69, 19, 0.2)',
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  cancelBtnText: {
    color: '#d4b896',
    fontWeight: '600',
    fontSize: 12,
  },
  confirmBtn: {
    borderRadius: 6,
    overflow: 'hidden',
    flex: 1,
    marginLeft: 8,
  },
  confirmBtnGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  vendorButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  vendorButtonGradient: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  vendorButtonText: { 
    color: 'white', 
    fontWeight: '700', 
    fontSize: 14,
  },

  modalContainer: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    height: '60%',
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#3d2815',
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#fff',
  },
  modalCloseBtn: {
    padding: 2,
  },
  modalClose: { 
    color: '#d4b896', 
    fontSize: 20,
    fontWeight: '300',
  },
  modalBody: { 
    padding: 16,
  },
  modalTaskTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 16, 
    color: '#fff',
    lineHeight: 22,
  },
  tipContainer: { 
    marginBottom: 16,
    backgroundColor: 'rgba(44, 26, 15, 0.6)',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#C19A6B',
  },
  tipTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    marginBottom: 8, 
    color: '#f0e6d8',
  },
  tip: { 
    fontSize: 13, 
    color: '#d4b896', 
    marginBottom: 4,
    lineHeight: 18,
  },
  modalVendorBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  modalVendorBtnGradient: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalVendorBtnText: { 
    color: 'white', 
    textAlign: 'center', 
    fontWeight: '700', 
    fontSize: 14,
  },
});