'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useRouter } from 'next/navigation';
import { myTasksService } from '@/services/my-tasks.service';
import { MyTask, TaskList, TASK_LIST_COLORS } from '@/types/my-tasks.types';
import { Plus, Trash2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModal } from '@/contexts/modal-context';

/**
 * FIRESTORE COMPOSITE INDEXES REQUIRED:
 *
 * Collection: my_task_lists
 * - userId (Ascending) + order (Ascending)
 *
 * Collection: my_tasks
 * - listId (Ascending) + userId (Ascending) + order (Ascending)
 * - userId (Ascending) + order (Ascending)
 */

export default function MyTasksPage() {
    const { user, loading: authLoading } = useEnhancedAuth();
    const router = useRouter();

    const [taskLists, setTaskLists] = useState<TaskList[]>([]);
    const [tasks, setTasks] = useState<MyTask[]>([]);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateListModal, setShowCreateListModal] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    const { openModal, closeModal } = useModal();
    useEffect(() => {
        if (showCreateListModal) openModal();
        else closeModal();
    }, [showCreateListModal, openModal, closeModal]);

    useEffect(() => {
        if (!user) return;
        const loadData = async () => {
            try {
                setLoading(true);
                const [lists, allTasks] = await Promise.all([
                    myTasksService.getUserTaskLists(user.uid),
                    myTasksService.getAllUserTasks(user.uid),
                ]);
                setTaskLists(lists);
                setTasks(allTasks);
                if (lists.length > 0 && !selectedListId) setSelectedListId(lists[0].id);
            } catch (err) {
                console.error('Error loading data:', err);
                setError('Failed to load tasks');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user]);

    const handleCreateList = async (name: string, color: string) => {
        if (!user) return;
        try {
            const newList = await myTasksService.createTaskList(user.uid, { name, color, order: taskLists.length });
            setTaskLists([...taskLists, newList]);
            setSelectedListId(newList.id);
            setShowCreateListModal(false);
        } catch (err) { console.error(err); }
    };

    const handleDeleteList = async (listId: string) => {
        if (!confirm('Delete this list and all its tasks?')) return;
        if (!user) return;
        try {
            await myTasksService.deleteTaskList(listId, user.uid);
            setTaskLists(taskLists.filter(l => l.id !== listId));
            setTasks(tasks.filter(t => t.listId !== listId));
            if (selectedListId === listId) {
                const remaining = taskLists.filter(l => l.id !== listId);
                setSelectedListId(remaining.length > 0 ? remaining[0].id : null);
            }
        } catch (err) { console.error(err); }
    };

    const handleAddTask = async () => {
        if (!user || !selectedListId || !newTaskTitle.trim()) return;
        try {
            const listTasks = tasks.filter(t => t.listId === selectedListId);
            const newTask = await myTasksService.createTask({
                listId: selectedListId,
                userId: user.uid,
                title: newTaskTitle.trim(),
                order: listTasks.length,
            });
            setTasks([...tasks, newTask]);
            setNewTaskTitle('');
            inputRef.current?.focus();
        } catch (err) { console.error(err); }
    };

    const handleToggleTask = async (task: MyTask) => {
        if (togglingId === task.id) return;
        setTogglingId(task.id);
        try {
            await myTasksService.updateTask(task.id, { completed: !task.completed });
            setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
        } catch (err) { console.error(err); }
        finally { setTogglingId(null); }
    };

    const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await myTasksService.deleteTask(taskId);
            setTasks(tasks.filter(t => t.id !== taskId));
        } catch (err) { console.error(err); }
    };

    const selectedList = taskLists.find(l => l.id === selectedListId);
    const listTasks = tasks.filter(t => t.listId === selectedListId);
    const activeTasks = listTasks.filter(t => !t.completed);
    const completedTasks = listTasks.filter(t => t.completed);

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading your tasks…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <p className="text-destructive text-sm">{error}</p>
                    <button onClick={() => window.location.reload()} className="px-5 py-2 bg-foreground text-background rounded-md border-2 border-border text-sm font-semibold">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="max-w-2xl mx-auto px-4 pb-32 md:pb-10 pt-2">
            {/* Page header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-[28px] font-bold tracking-tight text-foreground">My Tasks</h1>
                <button
                    onClick={() => setShowCreateListModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-foreground text-background rounded-md border-2 border-border text-sm font-semibold active:scale-95 transition-transform"
                >
                    <Plus className="w-4 h-4" />
                    New List
                </button>
            </div>

            {/* List cards — iOS Reminders style */}
            {taskLists.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-3">
                    {taskLists.map(list => {
                        const count = tasks.filter(t => t.listId === list.id && !t.completed).length;
                        const isSelected = selectedListId === list.id;
                        return (
                            <button
                                key={list.id}
                                onClick={() => setSelectedListId(list.id)}
                                className={cn(
                                    "relative text-left rounded-2xl p-4 transition-all duration-200 active:scale-[0.97]",
                                    "shadow-sm",
                                    isSelected
                                        ? "ring-2 ring-offset-1 dark:ring-offset-background"
                                        : "opacity-80 hover:opacity-100"
                                )}
                                style={{
                                    backgroundColor: list.color + '18',
                                    ...(isSelected ? { outline: `2px solid ${list.color}`, outlineOffset: '2px' } : {}),
                                }}
                            >
                                <div className="w-9 h-9 rounded-full mb-3 flex items-center justify-center" style={{ backgroundColor: list.color }}>
                                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                                </div>
                                <p className="text-[22px] font-bold leading-none mb-1" style={{ color: list.color }}>{count}</p>
                                <p className="text-[13px] font-semibold text-muted-foreground truncate">{list.name}</p>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Selected list content */}
            {selectedList ? (
                <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
                    {/* List header */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedList.color }} />
                            <span className="text-[15px] font-semibold text-foreground">{selectedList.name}</span>
                            <span className="text-[12px] text-muted-foreground">{activeTasks.length} remaining</span>
                        </div>
                        <button
                            onClick={() => handleDeleteList(selectedList.id)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Delete list"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Active tasks */}
                    {activeTasks.length > 0 && (
                        <ul className="mt-1">
                            {activeTasks.map((task, i) => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
                                    color={selectedList.color}
                                    isToggling={togglingId === task.id}
                                    onToggle={() => handleToggleTask(task)}
                                    onDelete={(e) => handleDeleteTask(task.id, e)}
                                    showDivider={i < activeTasks.length - 1}
                                />
                            ))}
                        </ul>
                    )}

                    {/* Add task row */}
                    <div className="flex items-center gap-3 px-4 py-3 border-t border-border dark:border-white/[0.06]">
                        <div className="w-6 h-6 rounded-full border-2 border-dashed flex-shrink-0"
                            style={{ borderColor: selectedList.color + '80' }} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                            placeholder="Add a task…"
                            className="flex-1 bg-transparent text-[15px] text-foreground placeholder-gray-400 focus:outline-none"
                        />
                        {newTaskTitle.trim() && (
                            <button
                                onClick={handleAddTask}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-transform active:scale-90"
                                style={{ backgroundColor: selectedList.color }}
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Completed section */}
                    {completedTasks.length > 0 && (
                        <div className="border-t border-border dark:border-white/[0.06]">
                            <button
                                onClick={() => setShowCompleted(v => !v)}
                                className="flex items-center justify-between w-full px-4 py-3 text-left"
                            >
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                    Completed ({completedTasks.length})
                                </span>
                                {showCompleted
                                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </button>
                            {showCompleted && (
                                <ul>
                                    {completedTasks.map((task, i) => (
                                        <TaskRow
                                            key={task.id}
                                            task={task}
                                            color={selectedList.color}
                                            isToggling={togglingId === task.id}
                                            onToggle={() => handleToggleTask(task)}
                                            onDelete={(e) => handleDeleteTask(task.id, e)}
                                            showDivider={i < completedTasks.length - 1}
                                            completed
                                        />
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Empty state */}
                    {activeTasks.length === 0 && completedTasks.length === 0 && (
                        <div className="px-4 py-10 text-center">
                            <p className="text-[14px] text-muted-foreground">No tasks yet — add one above</p>
                        </div>
                    )}
                </div>
            ) : (
                /* No lists state */
                <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 bg-muted dark:bg-white/[0.06] rounded-2xl flex items-center justify-center mx-auto">
                        <Check className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-[15px] text-muted-foreground">No lists yet</p>
                    <button
                        onClick={() => setShowCreateListModal(true)}
                        className="px-5 py-2.5 bg-foreground text-background rounded-md border-2 border-border text-sm font-semibold"
                    >
                        Create your first list
                    </button>
                </div>
            )}

            {/* Create List Modal */}
            {showCreateListModal && (
                <CreateListModal
                    onClose={() => setShowCreateListModal(false)}
                    onCreate={handleCreateList}
                />
            )}
        </div>
    );
}

/* ── Task Row ────────────────────────────────────────────── */
interface TaskRowProps {
    task: MyTask;
    color: string;
    isToggling: boolean;
    onToggle: () => void;
    onDelete: (e: React.MouseEvent) => void;
    showDivider?: boolean;
    completed?: boolean;
}

function TaskRow({ task, color, isToggling, onToggle, onDelete, showDivider, completed }: TaskRowProps) {
    return (
        <li
            className={cn(
                "flex items-center gap-3 px-4 py-3 cursor-pointer select-none",
                "active:bg-muted dark:active:bg-white/[0.04] transition-colors",
                showDivider && "border-b border-border dark:border-white/[0.05]",
                completed && "opacity-50"
            )}
            onClick={onToggle}
        >
            {/* Checkbox */}
            <div
                className={cn(
                    "w-[22px] h-[22px] rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200",
                    isToggling && "scale-90 opacity-70",
                    completed ? "border-0" : "border-2"
                )}
                style={completed
                    ? { backgroundColor: color }
                    : { borderColor: color }
                }
            >
                {completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>

            {/* Title */}
            <span className={cn(
                "flex-1 text-[15px] leading-snug text-foreground",
                completed && "line-through text-muted-foreground"
            )}>
                {task.title}
            </span>

            {/* Delete — tap area */}
            <button
                onClick={onDelete}
                className="p-1.5 -mr-1 text-muted-foreground hover:text-destructive dark:text-muted-foreground dark:hover:text-destructive rounded-lg transition-colors active:scale-90"
                aria-label="Delete task"
            >
                <X className="w-4 h-4" />
            </button>
        </li>
    );
}

/* ── Create List Modal ───────────────────────────────────── */
interface CreateListModalProps {
    onClose: () => void;
    onCreate: (name: string, color: string) => void;
}

function CreateListModal({ onClose, onCreate }: CreateListModalProps) {
    const [name, setName] = useState('');
    const [color, setColor] = useState(TASK_LIST_COLORS[0]);

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Sheet */}
            <div
                className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md m-4 p-6 sm:p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[17px] font-semibold text-foreground">New List</h3>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-muted dark:bg-white/[0.08] text-muted-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && name.trim() && onCreate(name.trim(), color)}
                    placeholder="List name"
                    autoFocus
                    className="w-full px-4 py-3 bg-muted dark:bg-white/[0.06] rounded-xl text-[15px] text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary mb-5"
                />

                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Colour</p>
                <div className="flex flex-wrap gap-3 mb-6">
                    {TASK_LIST_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={cn(
                                "w-9 h-9 rounded-full transition-all active:scale-90",
                                color === c && "ring-2 ring-offset-2 dark:ring-offset-card scale-110"
                            )}
                            style={{ backgroundColor: c, outlineColor: c }}
                            aria-label={`Select colour ${c}`}
                        />
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-border dark:border-white/[0.1] text-[15px] font-medium text-muted-foreground"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => name.trim() && onCreate(name.trim(), color)}
                        disabled={!name.trim()}
                        className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white disabled:opacity-40 transition-opacity"
                        style={{ backgroundColor: color }}
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    , document.body);
}
