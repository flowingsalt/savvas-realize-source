angular.module('Realize.assignment.assignmentsListByStudentService', [])
    .service('AssignmentListByStudentService', [

        function() {
            'use strict';
            var svc = this;

            svc.studentDash = function(student) {
                if (student.totalAssignmentsCount === 0 ||
                   (student.notSentAssignmentsCount === 0 && student.notScoredAssignmentsCount === 0 &&
                   (!student.studentAverageScore || !student.studentAverageScore.isValid))) {
                    return student.name;
                } else {
                    return undefined;
                }
            };

            svc.studentAverage = function(student) {
                if (student.notScoredAssignmentsCount === 0 &&
                    student.notSentAssignmentsCount === 0 &&
                    student.totalAssignmentsCount > 0 &&
                    student.studentAverageScore.isValid) {
                    return student.studentAverageScore.average;
                } else {
                    return undefined;
                }
            };

            svc.studentAverageSecondary = function(student) {
                var studentAverageResult = svc.studentAverage(student);
                if (studentAverageResult !== undefined) {
                    return student.name;
                } else {
                    return undefined;
                }
            };

            svc.studentNotSentAverage = function(student) {
                if (student.notSentAssignmentsCount > 0 &&
                    student.studentAverageScore.isValid) {
                    return student.studentAverageScore.average;
                } else {
                    return undefined;
                }
            };

            svc.studentNotSentAverageSecondary = function(student) {
                var studentNotSentAverageResult = svc.studentNotSentAverage(student);
                if (studentNotSentAverageResult !== undefined) {
                    return student.name;
                } else {
                    return undefined;
                }
            };

            svc.studentNotSent = function(student) {
                if (student.notSentAssignmentsCount > 0) {
                    return student.notSentAssignmentsCount;
                } else {
                    return undefined;
                }
            };

            svc.studentNotScoredAverage = function(student) {
                if (student.notScoredAssignmentsCount > 0 && student.notSentAssignmentsCount === 0 &&
                    student.studentAverageScore.isValid) {
                    return student.studentAverageScore.average;
                } else {
                    return undefined;
                }
            };

            svc.studentNotScoredAverageSecondary = function(student) {
                var studentNotScoredAverageResult = svc.studentNotScoredAverage(student);
                if (studentNotScoredAverageResult !== undefined) {
                    return student.name;
                } else {
                    return undefined;
                }
            };

            svc.studentNotScored = function(student) {
                if (student.notScoredAssignmentsCount > 0 && student.notSentAssignmentsCount === 0) {
                    return student.notScoredAssignmentsCount;
                } else {
                    return undefined;
                }
            };

            var sortByScore = [
                svc.studentDash,
                svc.studentNotScored,
                svc.studentNotScoredAverage,
                svc.studentNotScoredAverageSecondary,
                svc.studentNotSent,
                svc.studentNotSentAverage,
                svc.studentNotSentAverageSecondary,
                svc.studentAverage,
                svc.studentAverageSecondary
            ];

            this.getSortByScore = function() {
                return sortByScore;
            };

        }

    ]);
