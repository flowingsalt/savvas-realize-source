angular.module('Realize.assignment.teacher.notebook.notebookCtrl', [
    'Realize.assignment.teacher.notebook.notebookConfig',
    'Realize.assignment.teacher.notebook.apiService',
    'Realize.common.studentNavigation',
    'Realize.assignment.utilService',
    'rlzComponents.routedComponents.assignments',
    'rlzComponents.components.rbsToken',
    'Realize.user.currentUser',
])
    .controller('NotebookCtrl', [
        '$rootScope',
        'NotebookApiService',
        'resolveClassAndAssignmentData',
        'NOTEBOOK_CONSTANTS',
        '$location',
        'NavigationService',
        '$routeParams',
        'AssignmentUtil',
        'resolveGroupData',
        'assignmentHelperService',
        'rbsTokenService',
        '$currentUser',
        '$window',
        'featureManagementService',
        function($rootScope, NotebookApiService, resolveClassAndAssignmentData, NOTEBOOK_CONSTANTS,
            $location, NavigationService, $routeParams, AssignmentUtil, resolveGroupData, assignmentHelperService,
            rbsTokenService, $currentUser, $window, featureManagementService) {
            'use strict';
            var self = this;
            NotebookApiService.assignmentData = resolveClassAndAssignmentData;
            var currentRoster = resolveClassAndAssignmentData.roster,
            assignment = resolveClassAndAssignmentData.assignment;
            self.assignedTo = assignmentHelperService.getAssignedToList(assignment, currentRoster, resolveGroupData);
            self.assignmentTitle = NotebookApiService.getPageTitle();
            self.showAllNotes = false;
            self.completedStudents = NotebookApiService.getCompletedStudentList();
            self.currentStudent = _.findWhere(self.completedStudents,
                {userAssignmentId: $routeParams.userAssignmentId});
            $rootScope.viewLoading = true;
            self.isError = false;

            self.showStudentReview = function(student) {
                var path = $location.path().replace($routeParams.userAssignmentId, student.userAssignmentId);
                NavigationService.replaceLocationWith(path);
            };

            var enableNotebookAppsyncIntegration = featureManagementService.isNotebookAppSyncIntegrationEnabled();

            if (enableNotebookAppsyncIntegration) {
                $window.UserActivityCore.notifications().subscribe(function(info) {
                    var message = info.message;
                    switch (message.errorType) {
                        case 'AUTH_ERROR':
                            if (message.canRecover) {
                                rbsTokenService
                                    .recoverToken()
                                    .then(function(token) {
                                        authenticate(token);
                                    });
                            }
                            break;
                        default:
                        // Do Nothing
                    }
                });

                rbsTokenService.getToken()
                    .then(function(token) {
                        authenticate(token);
                        NotebookApiService.resolveNotebookTocAppSync(self.currentStudent)
                            .then(function(data) {
                                self.toc = data;
                                self.showAllNotes = true;
                                $rootScope.viewLoading = false;
                            });
                    });
            } else {
                NotebookApiService.resolveNotebookToc()
                    .then(function(data) {
                        self.toc = data;
                        self.showAllNotes = true;
                        $rootScope.viewLoading = false;
                    });
            }

            self.back = function() {
                var next = AssignmentUtil.generateNotebookBackLink(self.currentStudent.studentInfo.userId);
                NavigationService.replaceLocationWith(next);
            };

            $rootScope.$on('notebook.server.error', function() {
                self.isError = true;
                $rootScope.viewLoading = false;
            });

            var authenticate = function(token) {
                var rbsToken = token.startsWith('Bearer') ? token.split(' ')[1] : token;
                $window.UserActivityCore.authenticate({userId: $currentUser.userId, token: rbsToken});
            };
        }
    ]);
