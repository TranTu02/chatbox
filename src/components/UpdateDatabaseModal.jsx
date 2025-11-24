import React, { useState } from 'react';
import { AiOutlineClose } from 'react-icons/ai';

const UpdateDatabaseModal = ({ isOpen, onClose, data, onUpdate }) => {
  const [selectedTable, setSelectedTable] = useState('');

  if (!isOpen) return null;

  // Separate metadata from main data
  const { metadata, ...mainData } = data || {};

  // Helper function to format nested objects
  const formatValue = (value) => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  // Get all keys (excluding nested objects at value level)
  const mainDataEntries = Object.entries(mainData);
  const metadataEntries = metadata ? Object.entries(metadata) : [];

  const handleUpdate = () => {
    if (!selectedTable) {
      alert('Vui lòng chọn bảng cập nhật!');
      return;
    }

    const confirmed = window.confirm(`Xác nhận cập nhật bảng "${getTableLabel(selectedTable)}"?`);
    if (!confirmed) return;

    if (onUpdate) {
      onUpdate({ ...data, targetTable: selectedTable });
    }
    
    alert('Cập nhật thành công!');
    setSelectedTable('');
    onClose();
  };

  const getTableLabel = (value) => {
    switch (value) {
      case 'protocol':
        return 'Phương pháp';
      case 'parameter':
        return 'Phép thử';
      default:
        return value;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Cập nhật cơ sở dữ liệu</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <AiOutlineClose className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Main Data Table */}
          {mainDataEntries.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Dữ liệu chính</h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-top" style={{ width: '250px' }}>
                        Object Key
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-top">
                        Object Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mainDataEntries.map(([key, value], index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-2 py-2 text-sm font-medium text-gray-900 align-top">
                          {key}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-700 align-top">
                          <pre className="whitespace-pre-wrap break-words font-mono text-xs bg-gray-50 p-2 rounded">
                            {formatValue(value)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Metadata Table */}
          {metadataEntries.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Metadata</h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider align-top" style={{ width: '250px' }}>
                        Object Key
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider align-top">
                        Object Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metadataEntries.map(([key, value], index) => (
                      <tr key={index} className="hover:bg-blue-50">
                        <td className="px-2 py-2 text-sm font-medium text-gray-900 align-top">
                          {key}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-700 align-top">
                          <pre className="whitespace-pre-wrap break-words font-mono text-xs bg-gray-50 p-2 rounded">
                            {formatValue(value)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-3 border-t bg-gray-50">
          {/* Table Selection */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Chọn bảng cập nhật:</label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Chọn bảng --</option>
              <option value="protocol">Phương pháp</option>
              <option value="parameter">Phép thử</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            {selectedTable && (
              <button
                onClick={handleUpdate}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Cập nhật
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateDatabaseModal;
