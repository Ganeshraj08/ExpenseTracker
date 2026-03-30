import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { useExpenses } from "../context/ExpenseContext";
import { useCategories } from "../context/CategoryContext";
import { useToast } from "../context/ToastContext";
import { useModal } from "../context/ModalContext";
import { downloadCSV } from "../utils/helpers";
import { Download, AlertTriangle, Pencil, Tags, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

export function Settings() {
  const { user, loginWithGoogle, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { expenses, clearAllData, batchUpdateParentCategory, batchUpdateSubcategory } = useExpenses();
  const { categories, addParentCategory, updateParentCategory, deleteParentCategory, addSubcategory, updateSubcategory, deleteSubcategory } = useCategories();
  const { addToast } = useToast();
  const { confirm, prompt } = useModal();
  
  const [isClearing, setIsClearing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  const handleClearData = async () => {
     const isConfirmed = await confirm({
        title: "Danger Zone",
        message: "Are you completely sure you want to permanently delete ALL your transactions? This cannot be undone.",
        confirmText: "Delete All Data",
        confirmVariant: "danger"
     });
     if (isConfirmed) {
        setIsClearing(true);
        try {
           await clearAllData();
           addToast("Your data has been successfully reset to default.", "success");
        } catch (e) {
           addToast("Failed to clear data.", "error");
        } finally {
           setIsClearing(false);
        }
     }
  };

  const toggleExpand = (id) => {
     setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddParent = async () => {
     const name = await prompt({
        title: "Add Category",
        label: "New Category Name:"
     });
     if (name && name.trim()) {
        try {
           await addParentCategory(name);
           addToast(`Category "${name}" added`, "success");
        } catch (e) {
           addToast("Failed to add category", "error");
        }
     }
  };

  const handleEditParent = async (cat) => {
     const newName = await prompt({
        title: "Rename Category",
        label: `Rename "${cat.name}" to:`,
        defaultValue: cat.name,
        confirmText: "Rename"
     });
     if (newName && newName.trim() && newName.trim() !== cat.name) {
        const isConfirmed = await confirm({
           title: "Rename Category",
           message: `Rename ${cat.name} to ${newName}? This will update all historical expenses.`
        });
        if (isConfirmed) {
           try {
              await updateParentCategory(cat.id, newName.trim());
              await batchUpdateParentCategory(cat.name, newName.trim());
              addToast(`Category renamed to "${newName.trim()}"`, "success");
           } catch (e) {
              addToast("Failed to rename category", "error");
           }
        }
     }
  };

  const handleDeleteParent = async (cat) => {
     const isConfirmed = await confirm({
        title: "Delete Category",
        message: `Delete "${cat.name}"? Historical expenses will be kept but considered 'Uncategorized' if you edit them later.`,
        confirmText: "Delete",
        confirmVariant: "danger"
     });
     if (isConfirmed) {
        try {
           await deleteParentCategory(cat.id);
           addToast(`Category "${cat.name}" deleted`, "success");
        } catch (e) {
           addToast("Failed to delete category", "error");
        }
     }
  };

  const handleAddSub = async (cat) => {
     const name = await prompt({
        title: "Add Subcategory",
        label: `New Subcategory for ${cat.name}:`
     });
     if (name && name.trim()) {
        try {
           await addSubcategory(cat.id, name);
           addToast(`Subcategory "${name}" added`, "success");
        } catch (e) {
           addToast("Failed to add subcategory", "error");
        }
     }
  };

  const handleEditSub = async (cat, oldSub) => {
     const newName = await prompt({
        title: "Rename Subcategory",
        label: `Rename "${oldSub}" to:`,
        defaultValue: oldSub,
        confirmText: "Rename"
     });
     if (newName && newName.trim() && newName.trim() !== oldSub) {
        const isConfirmed = await confirm({
           title: "Rename Subcategory",
           message: `Rename '${oldSub}' to '${newName}'? This will update all corresponding historical expenses under ${cat.name}.`
        });
        if (isConfirmed) {
           try {
              await updateSubcategory(cat.id, oldSub, newName.trim());
              await batchUpdateSubcategory(cat.name, oldSub, newName.trim());
              addToast(`Subcategory renamed to "${newName.trim()}"`, "success");
           } catch (e) {
              addToast("Failed to rename subcategory", "error");
           }
        }
     }
  };

  const handleDeleteSub = async (cat, sub) => {
     const isConfirmed = await confirm({
        title: "Delete Subcategory",
        message: `Delete subcategory "${sub}" from ${cat.name}?`,
        confirmText: "Delete",
        confirmVariant: "danger"
     });
     if (isConfirmed) {
        try {
           await deleteSubcategory(cat.id, sub);
           addToast(`Subcategory "${sub}" deleted`, "success");
        } catch (e) {
           addToast("Failed to delete subcategory", "error");
        }
     }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold dark:text-white">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
               <p className="font-medium text-slate-900 dark:text-slate-100">Theme</p>
               <p className="text-sm text-slate-500 dark:text-slate-400">Select your preferred interface theme.</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
               <button 
                 onClick={() => setTheme('light')}
                 className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${theme === 'light' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
               >
                 Light
               </button>
               <button 
                 onClick={() => setTheme('dark')}
                 className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${theme === 'dark' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
               >
                 Dark
               </button>
               <button 
                 onClick={() => setTheme('system')}
                 className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${theme === 'system' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
               >
                 System
               </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
           {user ? (
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="User" className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{user.displayName || 'User'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={logout} className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:border-slate-700">
                   Sign Out
                </Button>
             </div>
           ) : (
             <div className="text-center py-6">
                <p className="text-slate-600 dark:text-slate-400 mb-4">You are not signed in.</p>
                <Button onClick={loginWithGoogle}>Sign In with Google</Button>
             </div>
           )}
        </CardContent>
      </Card>

      {user && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2">
                 <Tags className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Category Intelligence
              </CardTitle>
              <Button onClick={handleAddParent} size="sm" variant="outline" className="h-8 gap-1">
                 <Plus className="w-4 h-4" /> Add Category
              </Button>
            </CardHeader>
            <CardContent>
               <div className="space-y-4 mt-2">
                  {categories.length === 0 ? (
                     <p className="text-sm text-slate-400 italic">No categories tracked yet.</p>
                  ) : (
                     <div className="space-y-2">
                        {categories.map(cat => (
                           <div key={cat.id} className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50">
                                 <button onClick={() => toggleExpand(cat.id)} className="flex items-center gap-2 flex-1 text-left font-medium text-sm text-slate-900 dark:text-slate-100 focus:outline-none">
                                    {expandedCategories[cat.id] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                    {cat.name}
                                 </button>
                                 <div className="flex items-center gap-1">
                                    <button onClick={() => handleAddSub(cat)} className="p-1.5 text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors" title="Add Subcategory"><Plus className="w-4 h-4" /></button>
                                    <button onClick={() => handleEditParent(cat)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors" title="Rename Category"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteParent(cat)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors" title="Delete Category"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                              </div>
                              {expandedCategories[cat.id] && (
                                 <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    {(!cat.subcategories || cat.subcategories.length === 0) ? (
                                       <p className="text-sm text-slate-500 italic pl-6">No subcategories.</p>
                                    ) : (
                                       <div className="space-y-2 pl-6">
                                          {cat.subcategories.map(sub => (
                                             <div key={sub} className="flex items-center justify-between group py-1">
                                                <span className="text-sm text-slate-600 dark:text-slate-300">{sub}</span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                   <button onClick={() => handleEditSub(cat, sub)} className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors" title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                                                   <button onClick={() => handleDeleteSub(cat, sub)} className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    )}
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-500">
                 <AlertTriangle className="w-5 h-5" /> Danger Zone Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                     <p className="font-medium text-slate-900 dark:text-slate-100">Export Transactions</p>
                     <p className="text-sm text-slate-500 dark:text-slate-400">Download a CSV copy of all your tracked expenses.</p>
                  </div>
                  <Button variant="outline" onClick={() => downloadCSV(expenses)} disabled={!expenses.length} className="shrink-0 gap-2">
                     <Download className="w-4 h-4" /> Download Full Record
                  </Button>
               </div>
               
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div>
                     <p className="font-medium text-slate-900 dark:text-slate-100">Reset Database</p>
                     <p className="text-sm text-slate-500 dark:text-slate-400">Permanently wipe all your transactions.</p>
                  </div>
                  <Button variant="outline" onClick={handleClearData} disabled={!user || isClearing} className="shrink-0 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/50 transition-colors">
                     {isClearing ? 'Deleting Database...' : 'Delete All Data'}
                  </Button>
               </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
