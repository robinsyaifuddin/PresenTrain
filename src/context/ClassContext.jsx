import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/services/api';
import { INITIAL_CLASSES } from '@/data/mockData';

const defaultClassContext = {
  classes: [],
  selectedClassId: 'ALL',
  setSelectedClassId: () => {},
  selectedClass: null,
  isLoadingClasses: false,
  refreshClasses: async () => {},
};

const ClassContext = createContext(defaultClassContext);

export function ClassProvider({ children, currentUser }) {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('presentrain_selected_class_id') || 'ALL';
    }
    return 'ALL';
  });
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  const fetchClasses = async () => {
    setIsLoadingClasses(true);
    try {
      const res = await api.getClasses();
      if (res && res.ok && Array.isArray(res.data)) {
        setClasses(res.data);
      }
    } catch (err) {
      console.warn('Gagal memuat daftar kelas:', err);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchClasses();
    }
  }, [currentUser]);

  // For Administrator, auto select their assigned class
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      const userClasses = Array.isArray(currentUser.managed_classes) && currentUser.managed_classes.length > 0
        ? currentUser.managed_classes
        : classes;
      
      if (userClasses.length > 0) {
        const isCurrentValid = userClasses.some(c => String(c.id) === String(selectedClassId));
        if (!isCurrentValid) {
          const firstClassId = String(userClasses[0].id);
          setSelectedClassId(firstClassId);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('presentrain_selected_class_id', firstClassId);
          }
        }
      }
    }
  }, [currentUser, classes, selectedClassId]);

  const handleSelectClass = (classId) => {
    setSelectedClassId(classId);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('presentrain_selected_class_id', classId);
    }
  };

  const selectedClass = classes.find(c => String(c.id) === String(selectedClassId)) || null;

  return (
    <ClassContext.Provider value={{
      classes,
      selectedClassId,
      setSelectedClassId: handleSelectClass,
      selectedClass,
      isLoadingClasses,
      refreshClasses: fetchClasses,
    }}>
      {children}
    </ClassContext.Provider>
  );
}

export function useClass() {
  return useContext(ClassContext) || defaultClassContext;
}
