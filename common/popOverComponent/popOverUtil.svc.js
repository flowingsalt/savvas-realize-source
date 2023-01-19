angular.module('Realize.common.popOverUtils', [
    'Realize.content.constants'
    ])
    .service('PopOverUtilService', [
        'CONTENT_CONSTANTS',
        'lwcI18nFilter',
        function(CONTENT_CONSTANTS, lwcI18nFilter) {
            'use strict';

            var popOver = this;

            popOver.getPopOverContentForScore = function(student) {
                var efficiency = student.userAssignmentDataList[0].score,
                    totalTasks = student.totalTasks;
                if (efficiency === CONTENT_CONSTANTS.FIXED_VALUE_MAX_SCORE) {
                    return lwcI18nFilter('assignmentList.popOverMessage.success.message', [totalTasks]);
                } else {
                    return lwcI18nFilter('assignmentList.popOverMessage.failure.message', [totalTasks]);
                }
            };

        }]);
