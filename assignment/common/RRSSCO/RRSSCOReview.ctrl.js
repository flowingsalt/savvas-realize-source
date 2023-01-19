angular.module('Realize.assignment.common.RRSSCOReviewCtrl', [
    'rlzComponents.components.i18n',
    'Realize.navigationService',
    'Realize.tinCanConfigService',
    'Realize.assignment.constants',
    'Realize.common.handlePostMessage',
    'Realize.user.currentUser',
    'rlzComponents.routedComponents.assignments'
])
.controller('RRSSCOReviewCtrl', [
    '$scope',
    '$window',
    '$log',
    'AssignmentData',
    'ContentData',
    'GroupData',
    '$location',
    '$routeParams',
    'NavigationService',
    'TinCanConfigService',
    'ASSIGNMENT_CONSTANTS',
    'sendPostMessage',
    '$currentUser',
    'assignmentHelperService',
    function($scope, $window, $log, AssignmentData, ContentData, GroupData, $location, $routeParams, NavigationService,
        TinCanConfigService, ASSIGNMENT_CONSTANTS, sendPostMessage, $currentUser, assignmentHelperService) {
        'use strict';
        var self = this;
        self.assignment = AssignmentData.assignment;
        self.content = ContentData;
        self.scoLoading = true;
        self.scoNotAvailable = false;

        self.studentList = AssignmentData.studentList;
        self.currentStudent = _.findWhere(self.studentList,
            {studentUuid: $routeParams.studentId});

        self.assignedTo = assignmentHelperService.getAssignedToList(self.assignment, AssignmentData.roster, GroupData);

        self.userAssignmentId = $routeParams.userAssignmentId;
        self.isFromAssignmentByStudentFlow = ($location.search().activeTab &&
            $location.search().activeTab === ASSIGNMENT_CONSTANTS.TABS.ASSIGNMENTSBYSTUDENT) ? true : false;

        self.back = function() {
            var isStudentReview = $currentUser.isStudent,
                fallback = isStudentReview ? getFallBackURLforStudent() : getFallBackURLforTeacher();
            NavigationService.back(fallback, true);
        };

        function getFallBackURLforStudent() {
            return $location.path().split('/assignments')[0] + '/assignments/' + self.assignment.assignmentId;
        }

        function getFallBackURLforTeacher() {
            var fallback,
                isFromAssignmentByClassScoreFlow = $location.absUrl().indexOf('gradeInput') !== -1;

            if (self.isFromAssignmentByStudentFlow) {
                fallback = $location.path().split('/assignments')[0] + '/assignments';
                $location.search({
                    status : $routeParams.status,
                    activeTab: $routeParams.activeTab
                });
            } else if (isFromAssignmentByClassScoreFlow) {
                fallback = $location.path().split('/gradeInput')[0] + '/gradeInput';
            } else {
                fallback = $location.path().split('/allstudents')[0] + '/allstudents';
            }
            return fallback;
        }

        self.isSCOUnavailable = function() {
            return (self.scoLoading || self.scoNotAvailable);
        };

        var showErrorMessage =  function() {
            self.scoLoading = false;
            self.scoNotAvailable = true;
        };

        var loadRRSSCO = function(messageData) {
            var actionType = messageData.data.action;
            if (actionType === 'getTCConfig') {
                var userAssignmentParamValue =  self.userAssignmentId;
                if (userAssignmentParamValue === undefined) {
                    userAssignmentParamValue = '';
                }
                TinCanConfigService.getTinCanSCOSettings(userAssignmentParamValue)
                    .then(function(response) {
                        sendPostMessage(response, messageData.source, messageData.origin);
                    }, function() {
                        showErrorMessage();
                    });
            } else if (actionType === 'getAuthorization') {
                TinCanConfigService.getTinCanAuthToken()
                    .then(function(response) {
                        sendPostMessage(response, messageData.source, messageData.origin);
                    }, function() {
                        showErrorMessage();
                    });
            } else {
                $log.log('Not supported call for TCConfig listener.');
            }
        };

        var receiveMessage = function(messageData) {
            var data = messageData.data;

            if (data.action) {
                loadRRSSCO(messageData);
            } else if (data.type && data.type === 'parmManagerReady') {
                self.scoLoading = false;
                $scope.$apply(); // To avoid delay in updating DOM
            } else {
                $log.log('Not supported call for TCConfig listener.');
            }
        };

        $scope.$on('postMessageEvent', function(event, messageData) {
            receiveMessage(messageData);
        });

        self.loadRRSSCOForStudent = function(student) {
            if (student.studentUuid === self.currentStudent.studentUuid) {
                return;
            }
            //find userAssignmentId of current RRS SCO item for selected student
            var metadata = self.assignment.$findItemMetadata($routeParams.itemId, student.studentUuid),
                next = $location.path().replace($routeParams.studentId, student.studentUuid)
                    .replace($routeParams.userAssignmentId, metadata.userAssignmentId);

            NavigationService.replaceLocationWith(next);
        };
    }
]);
