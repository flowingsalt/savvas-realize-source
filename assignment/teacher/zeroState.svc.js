angular.module('Realize.assignment.zeroStateService', [])
    .service('AssignmentZeroStateService', [
        '$log',
        function($log) {
            'use strict';

            var zeroState = {};

            this.calculateZeroState = function(currentClassAssignmentObj) {
                var currentZeroState = this.getZeroState(currentClassAssignmentObj.classId),
                    numStudents = currentClassAssignmentObj.studentsList.length,
                    numPrograms = currentClassAssignmentObj.classPrograms.length,
                    numActiveAssignments = currentClassAssignmentObj.assignmentsCount.totalActive,
                    numHiddenAssignments = currentClassAssignmentObj.assignmentsCount.totalHidden;

                currentZeroState.noPrograms = numPrograms === 0;
                currentZeroState.noStudents = numStudents === 0 && numPrograms > 0;
                currentZeroState.noAssignments = numPrograms > 0 && numStudents > 0 &&
                    numActiveAssignments === 0 && numHiddenAssignments === 0;
                currentZeroState.allHidden = numPrograms > 0 && numStudents > 0 &&
                    numActiveAssignments === 0 && numHiddenAssignments > 0;

                $log.log('Zero state updated for', currentClassAssignmentObj.classId, currentZeroState);

                return currentZeroState;
            };

            this.getZeroState = function(classId) {
                if (!zeroState[classId]) {
                    zeroState[classId] = {};
                }

                return zeroState[classId];
            };
        }
    ]);
