import React, { useState } from 'react';
import { useModel } from '../../../contexts/ModelContext';
import { AiOutlineDown } from 'react-icons/ai';

const ModelSelector = () => {
  const { selectedModel, setSelectedModel, availableModels, getModelById } = useModel();
  const [isOpen, setIsOpen] = useState(false);

  const selectedModelInfo = getModelById(selectedModel);

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Selected Model Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors min-w-[140px]"
      >
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-800">{selectedModelInfo?.name}</div>
        </div>
        <AiOutlineDown 
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-2">
              Chọn AI Model
            </div>
            
            {/* Group by category */}
            {['OpenAI', 'Google'].map(category => {
              const categoryModels = availableModels.filter(model => model.category === category);
              
              return (
                <div key={category} className="mb-3">
                  <div className="text-xs font-semibold text-gray-600 px-2 py-1 bg-gray-50 rounded">
                    {category}
                  </div>
                  
                  <div className="mt-1 space-y-1">
                    {categoryModels.map(model => (
                      <button
                        key={model.id}
                        onClick={() => handleModelSelect(model.id)}
                        className={`w-full px-3 py-2 rounded-md text-left transition-colors ${
                          selectedModel === model.id 
                            ? 'bg-blue-500 text-white font-medium' 
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <div className="text-sm">{model.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ModelSelector;