import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AssignmentPreview, ResourceWeeklySchedule } from '@/lib/ai/types'

interface AssignmentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  preview: AssignmentPreview | null
  onApplyAssignments: () => void
  onModifyAssignments?: () => void
  isApplying?: boolean
}

export const AssignmentPreviewModal: React.FC<AssignmentPreviewModalProps> = ({
  isOpen,
  onClose,
  preview,
  onApplyAssignments,
  onModifyAssignments,
  isApplying = false
}) => {
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)

  if (!preview) return null

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 100) return 'bg-red-500'
    if (utilization >= 90) return 'bg-yellow-500'
    if (utilization >= 70) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getUtilizationTextColor = (utilization: number) => {
    if (utilization >= 100) return 'text-red-700 bg-red-50'
    if (utilization >= 90) return 'text-yellow-700 bg-yellow-50'
    return 'text-green-700 bg-green-50'
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 80) return 'text-red-600 bg-red-50'
    if (priority >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📊 Assignment Preview"
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Assignment Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{preview.summary.totalTasks}</div>
              <div className="text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{preview.summary.immediateAssignments}</div>
              <div className="text-gray-600">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{preview.summary.deferredAssignments}</div>
              <div className="text-gray-600">Later Weeks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{preview.summary.overflowTasks}</div>
              <div className="text-gray-600">Overflow</div>
            </div>
          </div>

          {preview.summary.overflowTasks > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-yellow-800">
                  Some tasks scheduled beyond current week due to capacity constraints
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Resource Timeline View */}
        <div>
          <h3 className="font-medium text-gray-900 mb-4">Team Schedule Timeline</h3>
          <div className="space-y-4">
            {preview.schedules.map((schedule) => (
              <div key={schedule.resourceId} className="border border-gray-200 rounded-lg p-4">
                {/* Resource Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-gray-900">{schedule.resourceName}</h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {schedule.role}
                    </span>
                    <span className="text-sm text-gray-500">{schedule.weeklyCapacity}h/week capacity</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedResourceId(
                      selectedResourceId === schedule.resourceId ? null : schedule.resourceId
                    )}
                  >
                    {selectedResourceId === schedule.resourceId ? 'Hide Details' : 'View Details'}
                  </Button>
                </div>

                {/* Weekly Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {schedule.weeks.slice(0, 4).map((week) => {
                    const utilization = Math.round((week.assignedHours / schedule.weeklyCapacity) * 100)
                    return (
                      <div key={week.weekNumber} className="bg-gray-50 p-3 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Week {week.weekNumber}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getUtilizationTextColor(utilization)}`}>
                            {utilization}%
                          </span>
                        </div>

                        {/* Utilization Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getUtilizationColor(utilization)}`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>

                        <div className="text-xs text-gray-600">
                          <div>{week.assignedHours}h / {schedule.weeklyCapacity}h</div>
                          <div>{week.tasks.length} task{week.tasks.length !== 1 ? 's' : ''}</div>
                        </div>

                        {/* Task Preview */}
                        {week.tasks.length > 0 && (
                          <div className="mt-2">
                            {week.tasks.slice(0, 2).map((task) => (
                              <div key={task.taskId} className="text-xs text-gray-600 truncate">
                                • {task.title} ({task.hours}h)
                              </div>
                            ))}
                            {week.tasks.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{week.tasks.length - 2} more...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Detailed Task List (Expandable) */}
                {selectedResourceId === schedule.resourceId && (
                  <div className="mt-4 border-t pt-4">
                    <h5 className="font-medium text-gray-900 mb-3">Detailed Task Assignments</h5>
                    <div className="space-y-3">
                      {schedule.weeks.filter(week => week.tasks.length > 0).map((week) => (
                        <div key={week.weekNumber} className="bg-white p-3 border rounded">
                          <h6 className="font-medium text-gray-700 mb-2">Week {week.weekNumber}</h6>
                          <div className="space-y-2">
                            {week.tasks.map((task) => (
                              <div key={task.taskId} className="flex items-center justify-between text-sm">
                                <div className="flex-1">
                                  <span className="text-gray-900">{task.title}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-500">{task.hours}h</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                    P{task.priority}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Suggestions */}
        {preview.summary.overflowTasks > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 Optimization Suggestions</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Consider increasing team member weekly capacity</li>
              <li>• Split large tasks into smaller, manageable chunks</li>
              <li>• Adjust task priorities to move critical work to week 1</li>
              <li>• Add additional team members to reduce bottlenecks</li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isApplying}
            >
              Cancel
            </Button>
            {onModifyAssignments && (
              <Button
                variant="outline"
                onClick={onModifyAssignments}
                disabled={isApplying}
              >
                Modify Assignments
              </Button>
            )}
          </div>
          <Button
            onClick={onApplyAssignments}
            disabled={isApplying}
          >
            {isApplying ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Applying...</span>
              </div>
            ) : (
              'Apply Assignments'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}