import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { AffectedTask, SuggestedNewTask, Task } from './UpdateFlowModal'

interface ImpactReviewProps {
  updateDescription: string
  affectedTasks: AffectedTask[]
  suggestedNewTasks: SuggestedNewTask[]
  existingTasks: Task[]
  onComplete: (data: any) => void
  onBack: () => void
  isLoading: boolean
}

export const ImpactReview: React.FC<ImpactReviewProps> = ({
  updateDescription,
  affectedTasks,
  suggestedNewTasks,
  existingTasks,
  onComplete,
  onBack,
  isLoading
}) => {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set(affectedTasks.map(t => t.taskId))
  )
  const [selectedNewTasks, setSelectedNewTasks] = useState<Set<number>>(
    new Set(suggestedNewTasks.map((_, index) => index))
  )

  const handleTaskToggle = (taskId: string) => {
    const newSelected = new Set(selectedTaskIds)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTaskIds(newSelected)
  }

  const handleNewTaskToggle = (index: number) => {
    const newSelected = new Set(selectedNewTasks)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedNewTasks(newSelected)
  }

  const handleContinue = () => {
    const inProgressTasks = Array.from(selectedTaskIds)
      .map(taskId => existingTasks.find(t => t.id === taskId))
      .filter(task => task?.status === 'in_progress')
      .map(task => task!.id)

    onComplete({
      selectedTaskIds: Array.from(selectedTaskIds),
      selectedNewTasks: Array.from(selectedNewTasks).map(index => suggestedNewTasks[index]),
      inProgressTasksConfirmed: new Set(inProgressTasks)
    })
  }

  const getTaskDetails = (taskId: string) => {
    return existingTasks.find(t => t.id === taskId)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Update Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Update Description:</h3>
        <p className="text-sm text-gray-600">{updateDescription}</p>
      </div>

      {/* Analysis Results */}
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-medium text-blue-900">
              Analysis Results
            </h3>
          </div>
          <p className="text-xs text-blue-700">
            Found {affectedTasks.length} potentially affected task{affectedTasks.length !== 1 ? 's' : ''}
            {suggestedNewTasks.length > 0 && ` and ${suggestedNewTasks.length} suggested new task${suggestedNewTasks.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Affected Tasks */}
      {affectedTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Potentially Affected Tasks
          </h3>
          <div className="space-y-3">
            {affectedTasks.map((affected) => {
              const task = getTaskDetails(affected.taskId)
              if (!task) return null

              return (
                <div
                  key={affected.taskId}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTaskIds.has(affected.taskId)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTaskToggle(affected.taskId)}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.has(affected.taskId)}
                      onChange={() => handleTaskToggle(affected.taskId)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        {task.status === 'in_progress' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            ⚠️ In Progress
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        {task.description || 'No description'}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                        <span>Priority: {task.priority}</span>
                        <span>Est: {task.estimatedHours ? `${task.estimatedHours}h` : 'Not set'}</span>
                        <span>Relevance: {affected.relevanceScore}%</span>
                      </div>
                      <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                        <strong>Why affected:</strong> {affected.reason}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Suggested New Tasks */}
      {suggestedNewTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Suggested New Tasks
          </h3>
          <div className="space-y-3">
            {suggestedNewTasks.map((newTask, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedNewTasks.has(index)
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleNewTaskToggle(index)}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedNewTasks.has(index)}
                    onChange={() => handleNewTaskToggle(index)}
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900">{newTask.title}</h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        New
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {newTask.description}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Priority: {newTask.priority}</span>
                      <span>Est: {newTask.estimatedHours}h</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {affectedTasks.length === 0 && suggestedNewTasks.length === 0 && (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900">No Impact Detected</h3>
          <p className="mt-2 text-sm text-gray-500">
            The AI didn't find any existing tasks that would be affected by this update,
            and no new tasks were suggested.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between space-x-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={isLoading || (selectedTaskIds.size === 0 && selectedNewTasks.size === 0)}
        >
          Continue with Selected
          {(selectedTaskIds.size > 0 || selectedNewTasks.size > 0) && (
            <span className="ml-1">
              ({selectedTaskIds.size + selectedNewTasks.size})
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}