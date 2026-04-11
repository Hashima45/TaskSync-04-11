import { useState, useEffect, useRef } from 'react';
import { Menu, Settings, Sparkles, X } from 'lucide-react';
import { Task, TaskCategory, DashboardStats, UserProfile } from '@/types';
import { useTaskStore } from '@/store/taskStore';
import { TaskCategoryService } from '@/services/TaskCategoryService';
import { TaskScheduleService } from '@/services/TaskScheduleService';
import { TaskService } from '@/services/TaskService';
import { TaskLogService } from '@/services/TaskLogService';
import { UserPerformanceService } from '@/services/UserPerformanceService';
import { PriorityScoreService } from '@/services/PriorityScoreService';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { generateAISchedule, AIScheduleResult, NotEnoughHistoryError, saveAIScheduleToFirestore, loadAIScheduleFromFirestore } from '@/services/AIScheduleService';
import { DQLSchedulerModel } from '@/services/DQLModel';
import LoginPage from '@/components/LoginPage';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AIScheduleModal from '@/components/AIScheduleModal';
import AISchedulerPage from '@/components/AISchedulerPage';
import TaskForm from '@/components/TaskForm';
import DashboardStatistics from '@/components/DashboardStatistics';
import TaskTimeline from '@/components/TaskTimeline';
import UpcomingEvents from '@/components/UpcomingEvents';
import CalendarPage from '@/components/CalendarPage';
import TasksPage from '@/components/TasksPage';
import SettingsPage from '@/components/SettingsPage';
import AnalyticsPage from '@/components/AnalyticsPage';
import './App.css';

type FilterType = 'all' | 'todo' | 'in-progress' | 'completed' | 'overdue';

const attachCreatorMetadata = (
  tasks: Task[],
  user: User,
  fallbackName: string
): Task[] =>
  tasks.map((task) => ({
    ...task,
    createdByUid: task.createdByUid || user.uid,
    createdByName: task.createdByName || user.displayName || fallbackName || '',
    createdByEmail: task.createdByEmail || user.email || '',
  }));

const applyCategoryLabels = (tasks: Task[], categories: TaskCategory[]): Task[] =>
  tasks.map((task) => {
    const matchedCategory = categories.find(
      (category) => category.category_id === task.categoryId || category.name === task.category
    );

    if (!matchedCategory) {
      return task;
    }

    if (task.categoryId === matchedCategory.category_id && task.category === matchedCategory.name) {
      return task;
    }

    return {
      ...task,
      categoryId: matchedCategory.category_id,
      category: matchedCategory.name,
    };
  });

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
  const [firestoreUsername, setFirestoreUsername] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeTab, setActiveTab] = useState('dashboard');
const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiScheduleResult, setAIScheduleResult] = useState<AIScheduleResult | null>(null);
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [showScheduleReminder, setShowScheduleReminder] = useState(false);

  const { 
    tasks, 
    addTask, 
    updateTask, 
    deleteTask, 
    clearTasks, 
    setTasks,
    getTasks,
    setUser: setStoreUser,
    currentSchedule,
    setCurrentSchedule,
    setAIScheduleResult: setStoreAIScheduleResult,
  } = useTaskStore();

  // Prevents saving empty state before remote tasks finish loading.
  const tasksReadyRef = useRef(false);

  useEffect(() => {
    const loadCategories = async () => {
      const categories = await TaskCategoryService.getCategories();
      setTaskCategories(categories);
    };

    void loadCategories();
  }, []);

  useEffect(() => {
    if (taskCategories.length === 0 || tasks.length === 0) {
      return;
    }

    const normalizedTasks = applyCategoryLabels(tasks, taskCategories);
    const hasChanges = normalizedTasks.some(
      (task, index) => task.category !== tasks[index]?.category || task.categoryId !== tasks[index]?.categoryId
    );

    if (hasChanges) {
      setTasks(normalizedTasks);
    }
  }, [taskCategories, tasks, setTasks]);

  useEffect(() => {
    if (!user || !tasksReadyRef.current) {
      return;
    }

    void TaskScheduleService.syncUserSchedules(user.uid, tasks, currentSchedule);
  }, [user, tasks, currentSchedule]);

  const mergeCategory = (category: TaskCategory | null) => {
    if (!category) {
      return;
    }

    setTaskCategories((current) => {
      const next = current.filter((existing) => existing.category_id !== category.category_id);
      next.push(category);
      next.sort((left, right) => left.name.localeCompare(right.name));
      return next;
    });
  };

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        tasksReadyRef.current = false;
        setActiveTab('dashboard');
        clearTasks();
        setAIScheduleResult(null);
        setStoreAIScheduleResult(null);
      }
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let resolvedName = firebaseUser.displayName || '';

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFirestoreUsername(userData.username || '');
            resolvedName = userData.username || resolvedName;
          }

          const storeUserProfile: UserProfile = {
            id: firebaseUser.uid,
            name: resolvedName,
            email: firebaseUser.email || '',
            preferences: {
              theme: 'light',
              workingHours: { start: 8, end: 18 },
              breakDuration: 15,
            },
          };

          setStoreUser(storeUserProfile);

          // Initialize user performance record if it doesn't exist
          const existingPerformance = await UserPerformanceService.getUserPerformance(firebaseUser.uid);
          if (!existingPerformance) {
            await UserPerformanceService.createUserPerformance(firebaseUser.uid);
          }

          // Load user's tasks from Firestore using TaskService
          const firestoreTasks = await TaskService.getUserTasks(firebaseUser.uid);
          // Filter out soft-deleted tasks (those with deleted_at timestamp)
          const activeTasks = firestoreTasks.filter(task => !task.deleted_at);
          const convertedTasks = activeTasks.map(task => TaskService.firestoreToTask(task));
          const normalizedTasks = applyCategoryLabels(convertedTasks, taskCategories);
          const schedules = await TaskScheduleService.getUserSchedules(firebaseUser.uid);
          const scheduleMap = TaskScheduleService.toScheduleMap(schedules);
          
          // Attach creator metadata
          const tasksWithMetadata = attachCreatorMetadata(
            normalizedTasks,
            firebaseUser,
            firestoreUsername || ''
          );
          
          setTasks(tasksWithMetadata.length > 0 ? tasksWithMetadata : []);
          setCurrentSchedule(scheduleMap);

          // Restore persisted AI schedule so it survives logout / page refresh
          const persistedSchedule = await loadAIScheduleFromFirestore(firebaseUser.uid);
          if (persistedSchedule) {
            setAIScheduleResult(persistedSchedule);
            setStoreAIScheduleResult(persistedSchedule);
          }

          tasksReadyRef.current = true;
        } catch (e) {
          console.warn('Failed to load user profile/tasks from Firestore:', e);
          tasksReadyRef.current = true;
        }
      } else {
        setFirestoreUsername('');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [clearTasks, setTasks, setStoreUser]);


  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await signOut(auth);
    }
  };

  // Update dashboard statistics
  useEffect(() => {
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const overdue = tasks.filter((t) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDay = new Date(t.dueDate);
      dueDay.setHours(0, 0, 0, 0);
      return dueDay < today && t.status !== 'completed';
    }).length;
    setDashboardStats({
      totalTasks: tasks.length,
      completedTasks: completed,
      inProgressTasks: inProgress,
      overdueTasks: overdue,
      completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
    });
  }, [tasks]);



  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleCreateTask = () => {
    setEditingTask(undefined);
    setShowForm(true);
  };

  const handleFormSubmit = async (taskData: Partial<Task>) => {
    if (!user) return;

    const categoryName = (taskData.category || editingTask?.category || '').trim();
    const ensuredCategory = categoryName ? await TaskCategoryService.ensureCategoryExists(categoryName) : null;
    const normalizedCategoryName = ensuredCategory?.name || categoryName || 'Other';
    const normalizedCategoryId = ensuredCategory?.category_id || taskData.categoryId || editingTask?.categoryId;

    mergeCategory(ensuredCategory);
    
    if (editingTask) {
      // Update existing task
      updateTask(editingTask.id, {
        ...taskData,
        category: normalizedCategoryName,
        categoryId: normalizedCategoryId,
      });
      // Also update in Firestore
      try {
        await TaskService.updateTask(editingTask.id, {
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority_manual: taskData.priority,
          due_at: taskData.dueDate ? Timestamp.fromDate(new Date(taskData.dueDate)) : undefined,
          category_id: normalizedCategoryId,
          estimated_time: taskData.estimatedTime,
        });
        // Record update event
        await TaskLogService.recordEvent(
          editingTask.id,
          'updated'
        );
        
        // Update user performance metrics when task is edited
        if (user) {
          const updatedTasks = getTasks();
          await UserPerformanceService.updateUserPerformance(user.uid, updatedTasks);
        }
        
        // Update priority score for edited task
        const editedTask = getTasks().find(t => t.id === editingTask.id);
        if (editedTask) {
          await PriorityScoreService.updatePriorityScore(editedTask);
        }
      } catch (error) {
        console.error('Error updating task in Firestore:', error);
      }
    } else {
      // Create new task in Firestore first so the task document ID becomes the canonical task_id.
      try {
        const firestoreTaskId = await TaskService.createTask(user.uid, {
          title: taskData.title || '',
          description: taskData.description || '',
          status: taskData.status || 'todo',
          priority_manual: taskData.priority || 'medium',
          due_at: Timestamp.fromDate(new Date(taskData.dueDate || new Date())),
          category_id: normalizedCategoryId,
          estimated_time: taskData.estimatedTime || 30,
        });

        const newTask: Task = {
          id: firestoreTaskId,
          title: taskData.title || '',
          description: taskData.description || '',
          createdByUid: user?.uid,
          createdByName: user?.displayName || firestoreUsername || '',
          createdByEmail: user?.email || '',
          dueDate: taskData.dueDate || new Date(),
          priority: taskData.priority || 'medium',
          status: taskData.status || 'todo',
          category: normalizedCategoryName,
          categoryId: normalizedCategoryId,
          tags: taskData.tags || [],
          estimatedTime: taskData.estimatedTime || 30,
          actualTime: 0,
          subtasks: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        addTask(newTask);
        // Record create event
        await TaskLogService.recordEvent(
          firestoreTaskId,
          'created'
        );
        
        // Create priority score for new task
        await PriorityScoreService.createPriorityScore(newTask);
      } catch (error) {
        console.error('Error saving task to Firestore:', error);
      }
    }
    setShowForm(false);
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      // Get the task to retrieve its categoryId
      const taskToDelete = tasks.find(t => t.id === id);
      
      // Remove from app UI immediately
      deleteTask(id);
      
      // Soft delete in Firestore (mark as deleted but preserve data)
      try {
        // Record the deletion event first
        await TaskLogService.recordEvent(id, 'deleted');
        // Delete all related logs for this task
        await TaskLogService.deleteTaskLogs(id);
        // Delete all related schedules for this task
        await TaskScheduleService.deleteTaskSchedules(id);
        
        // Soft delete the task in Firestore (mark deleted_at timestamp)
        // This removes it from user view but preserves data for historical/AI analysis
        await TaskService.softDeleteTask(id);
        
        // Delete related priority score
        await PriorityScoreService.deletePriorityScore(id);
        
        // If task had a category, check if the category is still in use
        if (taskToDelete?.categoryId) {
          await TaskCategoryService.deleteCategoryIfUnused(taskToDelete.categoryId);
        }
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleStatusChange = async (id: string, status: Task['status']) => {
    updateTask(id, { status });
    // Also update in Firestore
    try {
      await TaskService.updateTaskStatus(id, status);
      // If changing to 'in-progress', record the actual start time
      if (status === 'in-progress' && user) {
        await TaskScheduleService.recordActualStartTime(user.uid, id);
      }
      // Record status change event
      await TaskLogService.recordEvent(
        id,
        'status_changed'
      );
      
      // Update user performance metrics whenever task status changes
      if (user) {
        const updatedTasks = getTasks();
        await UserPerformanceService.updateUserPerformance(user.uid, updatedTasks);
      }
      
      // Update priority score when task status changes
      const changedTask = getTasks().find(t => t.id === id);
      if (changedTask) {
        await PriorityScoreService.updatePriorityScore(changedTask);
      }
      
      // Incrementally train the DQL model when a task is completed or missed (blocked)
      // so it continuously learns from real outcomes without a full schedule regeneration.
      if ((status === 'completed' || status === 'blocked') && user) {
        const task = tasks.find(t => t.id === id);
        if (task) {
          const completedHour = new Date().getHours();
          const priorityNum = task.urgency != null && task.importance != null
            ? (task.urgency + task.importance) / 2
            : { high: 8, medium: 5, low: 2 }[task.priority] ?? 5;
          const model = await DQLSchedulerModel.load(user.uid);
          await model.trainOnSingleRecord({
            hour: Math.max(8, Math.min(21, completedHour)),
            priorityNum,
            durationHrs: (task.estimatedTime ?? 60) / 60,
            completed: status === 'completed',
          });
          await model.save(user.uid);
          model.dispose();
        }
      }
    } catch (error) {
      console.error('Error updating task status in Firestore:', error);
    }
  };

  const handleScheduleClick = () => {
    if (!user || schedulingLoading) return;
    setShowScheduleReminder(true);
  };

  const handleScheduleProceed = async () => {
    setShowScheduleReminder(false);
    if (!user || schedulingLoading) return;
    setSchedulingLoading(true);
    setScheduleError(null);
    try {
      const pendingTasks = tasks.filter(t => t.status !== 'completed');
      const result = await generateAISchedule(user.uid, pendingTasks, useTaskStore.getState().scheduleSettings);
      setAIScheduleResult(result);
      setStoreAIScheduleResult(result);
      void saveAIScheduleToFirestore(user.uid, result);
      // Navigate to scheduler page
      setActiveTab('scheduler');
    } catch (err) {
      if (err instanceof NotEnoughHistoryError) {
        setScheduleError(`You need at least 6 completed task records to use AI Schedule. You currently have ${err.count}.`);
        setActiveTab('scheduler');
      } else {
        console.error('AI Schedule error:', err);
      }
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleScheduleGoToSettings = () => {
    setShowScheduleReminder(false);
    setActiveTab('settings');
  };

  const handleAllTasksClick = () => {
    setActiveTab('tasks');
    setFilter('all');
  };

  const pendingTasks = tasks.filter((t) => t.status === 'todo').length;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleViewAllSchedule = () => {
    setActiveTab('tasks');
    setFilter('all');
  };

  const handleStatsFilterNavigation = (selectedFilter: FilterType) => {
    setFilter(selectedFilter);
    setActiveTab('tasks');
  };

  // const handleTrackingComplete = async (taskId: string, actualTime: number) => {
  //   // Update task with actual time
  //   const taskIndex = tasks.findIndex(t => t.id === taskId);
  //   if (taskIndex !== -1) {
  //     const updatedTask = {
  //       ...tasks[taskIndex],
  //       actualTime,
  //     };
  //     // Update in local state
  //     const newTasks = [...tasks];
  //     newTasks[taskIndex] = updatedTask;
  //     setTasks(newTasks);
  //
  //     // Update in Firestore
  //     try {
  //       await TaskService.updateTask(user!.uid, updatedTask);
  //       // Log the tracking event
  //       await TaskLogService.recordEvent(taskId, 'updated');
  //     } catch (error) {
  //       console.error('Error saving tracking data:', error);
  //     }
  //   }
  // };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={() => {}} />;
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
<Sidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        onSignOut={handleSignOut}
        onOpenChange={setSidebarOpen}
        isOpen={sidebarOpen}
      />
      
      <div className={`flex flex-col ${sidebarOpen ? 'ml-64' : 'ml-0'} lg:ml-64 h-full overflow-hidden`}>
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="bg-indigo-600 text-white p-2 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-800">TaskSync</span>
        </div>
        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 overflow-x-hidden pr-2">
          {activeTab !== 'calendar' && activeTab !== 'tasks' && activeTab !== 'scheduler' && activeTab !== 'settings' && activeTab !== 'analytics' && (
            <div className={activeTab === 'dashboard' ? 'tasks-page-enter' : undefined}>
              <Header onScheduleClick={handleScheduleClick} onAllTasksClick={handleAllTasksClick} userName={user?.displayName || firestoreUsername || undefined} schedulingLoading={schedulingLoading} />
            </div>
          )}
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
          {activeTab === 'calendar' ? (
            <div className="tasks-page-enter">
              <CalendarPage tasks={tasks} />
            </div>
          ) : activeTab === 'tasks' ? (
            <TasksPage
              tasks={tasks}
              categories={taskCategories}
              filter={filter}
              onFilterChange={setFilter}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onNewTask={handleCreateTask}
            />
          ) : activeTab === 'scheduler' ? (
            <div className="tasks-page-enter">
              <AISchedulerPage notEnoughDataMessage={scheduleError} />
            </div>
          ) : activeTab === 'settings' ? (
            <SettingsPage />
          ) : activeTab === 'analytics' ? (
            <div className="tasks-page-enter">
              <AnalyticsPage tasks={tasks} />
            </div>
          ) : (
            <div className="tasks-page-enter space-y-8">
              {/* Statistics */}
              <DashboardStatistics 
                stats={dashboardStats} 
                pendingTasks={pendingTasks}
                onFilterChange={handleStatsFilterNavigation}
              />

              {/* Schedule - Today's wider + Upcoming side */}
              {/* Schedule - Equal height 70/30 */}
              <div className="tasks-page-section grid grid-cols-1 lg:grid-cols-10 gap-6 lg:gap-8 items-stretch">
                <div className="lg:col-span-7">
                  <TaskTimeline tasks={tasks} onViewAllClick={handleViewAllSchedule} />
                </div>
                <div className="lg:col-span-3">
                  <UpcomingEvents tasks={tasks} />
                </div>
              </div>


            </div>
          )}
          </div>
        </main>
      </div>

      {/* Task Form Modal */}
      {showForm && (
        <TaskForm
          onSubmit={handleFormSubmit}
          onClose={() => setShowForm(false)}
          initialTask={editingTask}
          categories={taskCategories}
        />
      )}

      {/* AI Schedule Loading Overlay */}
      {schedulingLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-700 font-semibold">Generating your AI schedule…</p>
            <p className="text-gray-400 text-sm">Analysing your behaviour patterns</p>
          </div>
        </div>
      )}

      {/* AI Schedule Modal */}
      {aiScheduleResult && (
        <AIScheduleModal
          result={aiScheduleResult}
          onClose={() => setAIScheduleResult(null)}
        />
      )}

      {/* AI Schedule Reminder Modal */}
      {showScheduleReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowScheduleReminder(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowScheduleReminder(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Sparkles className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">AI Schedule Reminder</h3>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Before generating your AI schedule, make sure you've configured your preferences in <span className="font-semibold text-indigo-600">Settings</span> — such as work hours, break duration, and stress level — for the best results.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleScheduleGoToSettings}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 px-4 py-2.5 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Go to Settings
              </button>
              <button
                onClick={handleScheduleProceed}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
