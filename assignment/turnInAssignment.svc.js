angular.module('Realize.assignment.turnInAssignment', [
    'Realize.assignment.facadeService',
])
    .service('TurnInAssignmentService', [
        '$q',
        '$log',
        '$rootScope',
        'AssignmentFacadeService',
        function($q, $log, $rootScope, AssignmentFacadeService) {
            'use strict';
            var service = this;
            var setIsAdaptive = false;

            service.markComplete = function(assignment, deeplink) {
                var assignmentMetadata = assignment.$getPrimaryMetadata();
                return AssignmentFacadeService.setCompleted(assignmentMetadata.userAssignmentId,
                    setIsAdaptive, assignmentMetadata.itemType, deeplink)
                    .then(function(data) {
                        $log.log('Assignment was submitted successfully', data);
                        service.assignmentMarkedCompleteFn(assignment);
                        return $q.resolve();
                    }, function(err) {
                        $log.error('Failed to mark assignment as complete', err);
                        return $q.reject();
                    });
            };

            // callback function to be invoked after assignment has been marked as complete
            service.assignmentMarkedCompleteFn = function(assignment) {
                $rootScope.justCompletedAssignment = assignment.assignmentId;
            };
        }
    ]);

