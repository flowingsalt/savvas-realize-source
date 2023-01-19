angular.module('Realize.assignment.common.RRSSCOReview.routes', [
    'Realize.paths'
])

    .config([
        '$routeProvider',
        'PATH',
        function($routeProvider, PATH) {
            'use strict';

            var RRSSCOConfig = {
                    controller: 'RRSSCOReviewCtrl',
                    controllerAs: 'RRSSCOReviewCtrl',
                    templateUrl: PATH.TEMPLATE_ROOT + '/assignment/common/RRSSCO/RRSSCOReview.ctrl.html',
                    resolve: {
                        AssignmentData: ['Resolve',
                            function(Resolve) {
                                return Resolve.TeacherSingleAssignment()
                                    .then(function(resolveObj) {
                                        resolveObj.studentList =
                                            _.sortBy(resolveObj.completedList, function(student) {
                                                return student.studentInfo.lastFirst;
                                            });
                                        return resolveObj;
                                    });
                            }
                        ],
                        ContentData: ['ContentResolver',
                            function(ContentResolver) {
                                return ContentResolver();
                            }
                        ],
                        GroupData: ['Resolve',
                            function(Resolve) {
                                return Resolve.GroupList();
                            }
                        ]
                    }
                };

            $routeProvider
                .when('/classes/:classId/assignments/:assignmentId/allstudents/:studentId/RRSSCOReview/' +
                    ':itemId/:itemVersion/userAssignmentId/:userAssignmentId', RRSSCOConfig)
                .when('/classes/:classId/student/:studentId/assignments/:assignmentId/RRSSCOReview/:itemId/' +
                    ':itemVersion/userAssignmentId/:userAssignmentId', RRSSCOConfig)
                .when('/classes/:classId/assignments/:assignmentId/allstudents/gradeInput/:studentId/RRSSCOReview/' +
                    ':itemId/:itemVersion/userAssignmentId/:userAssignmentId', RRSSCOConfig)
                .when('/classes/:classId/assignments/:assignmentId/RRSSCOReview/:itemId/:itemVersion/' +
                    'userAssignmentId/:userAssignmentId', RRSSCOConfig);
        }
    ]);
