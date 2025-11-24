import React, { createContext, useState, useContext } from 'react';

const ModelContext = createContext(null);

export const useModel = () => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
};

export const ModelProvider = ({ children }) => {
  const [selectedModel, setSelectedModel] = useState('gpt-5.1');

  const availableModels = [
    { id: 'gpt-5.1', name: 'GPT-5.1', category: 'OpenAI' },
    { id: 'gpt-4.1', name: 'GPT-4.1', category: 'OpenAI' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', category: 'OpenAI' },
    { id: 'gpt-5', name: 'GPT-5', category: 'OpenAI' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', category: 'OpenAI' },
    { id: 'gpt-o4-mini', name: 'GPT-O4 Mini', category: 'OpenAI' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', category: 'Google' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', category: 'Google' },
  ];

  const value = {
    selectedModel,
    setSelectedModel,
    availableModels,
    getModelById: (id) => availableModels.find(model => model.id === id),
  };

  return (
    <ModelContext.Provider value={value}>
      {children}
    </ModelContext.Provider>
  );
};

export default ModelContext;