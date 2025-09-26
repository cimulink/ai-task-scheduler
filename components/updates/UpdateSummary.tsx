import React from 'react'
import { Button } from '@/components/ui/Button'
import { Task, TaskModification, SuggestedNewTask } from './UpdateFlowModal'

interface UpdateSummaryProps {
  updateDescription: string
  taskModifications: TaskModification[]
  newTasks: SuggestedNewTask[]
  existingTasks: Task[]
  onComplete: (data: any) => void
  onBack: () => void
  isLoading: boolean
  error: string | null
}

export const UpdateSummary: React.FC<UpdateSummaryProps> = ({
  updateDescription,
  taskModifications,
  newTasks,
  existingTasks,
  onComplete,
  onBack,
  isLoading,
  error
}) => {
  const getTaskDetails = (taskId: string) => {
    return existingTasks.find(t => t.id === taskId)
  }

  const handleApply = () => {
    onComplete({
      taskModifications,
      approvedNewTasks: newTasks
    })
  }

  const hasChanges = taskModifications.length > 0 || newTasks.length > 0

  return (
    <div className="space-y-6">
      {/* Update Description */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Update Description:</h3>
        <p className="text-sm text-gray-600">{updateDescription}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{taskModifications.length}</div>
          <div className="text-sm text-blue-800">Tasks to Modify</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{newTasks.length}</div>
          <div className="text-sm text-green-800">New Tasks to Create</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-600">
            {existingTasks.length - taskModifications.length}
          </div>
          <div className="text-sm text-gray-800">Tasks Unchanged</div>
        </div>
      </div>

      {/* Task Modifications Summary */}
      {taskModifications.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Tasks to be Modified
          </h3>
          <div className="space-y-3">
            {taskModifications.map((modification) => {
              const task = getTaskDetails(modification.taskId)
              if (!task) return null

              const changeCount = Object.keys(modification).filter(key =>
                key !== 'taskId' && key !== 'reasoning' && modification[key as keyof TaskModification] !== undefined
              ).length

              return (
                <div key={modification.taskId} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {task.title}
                    </h4>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      {changeCount} change{changeCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="text-xs text-blue-700 mb-2">
                    <strong>Changes:</strong>{' '}
                    {[
                      modification.title !== undefined && 'title',
                      modification.description !== undefined && 'description',
                      modification.estimatedHours !== undefined && 'estimated hours',
                      modification.priority !== undefined && 'priority'
                    ].filter(Boolean).join(', ')}
                  </div>

                  <p className="text-xs text-blue-600">{modification.reasoning}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* New Tasks Summary */}
      {newTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            New Tasks to be Created
          </h3>
          <div className="space-y-3">
            {newTasks.map((newTask, index) => (
              <div key={index} className="border border-green-200 bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    {newTask.title}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-green-600 bg-green-100 px-2 py-1 rounded">
                      {newTask.estimatedHours}h
                    </span>
                    <span className="text-green-600 bg-green-100 px-2 py-1 rounded">
                      Priority: {newTask.priority}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-green-700">{newTask.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Changes */}
      {!hasChanges && (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900">No Changes Required</h3>
          <p className="mt-2 text-sm text-gray-500">
            Based on your update description, no changes to existing tasks are needed
            and no new tasks were suggested.
          </p>
        </div>
      )}

      {/* Warning for in-progress tasks */}
      {taskModifications.some(mod => {
        const task = getTaskDetails(mod.taskId)
        return task?.status === 'in_progress'
      }) && (
        <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">
                In-Progress Tasks Will Be Modified
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                Some tasks that are currently in progress will be modified.
                Make sure to coordinate with team members working on these tasks.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
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
          onClick={handleApply}
          disabled={isLoading || !hasChanges}
          className={hasChanges ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Applying Changes...</span>
            </div>
          ) : (
            `Apply Changes${hasChanges ? ` (${taskModifications.length + newTasks.length})` : ''}`
          )}
        </Button>
      </div>
    </div>
  )
}