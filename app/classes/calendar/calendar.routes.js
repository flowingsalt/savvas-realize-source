angular.module('Realize.calendar.routes', [
    'Realize.assignment.facadeService',
    'Realize.content',
    'Realize.paths'
])
    .config([
        '$routeProvider',
        'PATH',
        function($routeProvider, PATH) {
            'use strict';

            var secureRoute = [
                    '$q',
                    '$currentUser',
                    function($q, $currentUser) {
                        var allowed = $currentUser.hasRole('ROLE_TEACHER');

                        if (!allowed) {
                            return $q.reject('Insufficient Privileges!');
                        }
                        return $q.when(1);
                    }
                ],

                //TODO: Find a place for re-usuable ContentViewerConfig & other config.
                ContentViewerConfig = {
                    controller: 'ContentCtrl',
                    templateUrl: PATH.TEMPLATE_ROOT + '/views/contentViewer.html',
                    resolve: {
                        _security: secureRoute,
                        ContentViewerData: ['ContentResolver',
                            function(ContentResolver) {
                                return ContentResolver();
                            }
                        ]
                    }
                },

                AssignmentPreviewConfig = {
                    controller: 'AssignmentLandingCtrl',
                    templateUrl: PATH.TEMPLATE_ROOT + '/assignment/common/landing.html',
                    resolve: {
                        _security: secureRoute,
                        RosterData: ['Resolve',
                            function(Resolve) {
                                return Resolve.ClassRoster();
                            }
                        ],
                        resolveAssignmentData: ['Resolve',
                            function(Resolve) {
                                return Resolve.SingleLWCAssignment();
                            }
                        ]
                    }
                },

                StudentsListConfig = {
                    controller: 'StudentListCtrl',
                    templateUrl: PATH.TEMPLATE_ROOT + '/views/studentsList.html',
                    resolve: {
                        _security: secureRoute,
                        ClassRosterData: ['Resolve',
                            function(Resolve) {
                                return Resolve.ClassRoster();
                            }
                        ]
                    }
                };

            $routeProvider
                .when('/classes/:classId/calendar', {
                    controller: 'ClassCalendarCtrl',
                    templateUrl: PATH.TEMPLATE_ROOT + '/app/classes/calendar/classesCalendar.html',
                    resolve: {
                        _security: secureRoute,
                        ClassRosters: ['Resolve',
                            function(Resolve) {
                                return Resolve.ClassRosters();
                            }
                        ],
                        CurrentRoster: ['Resolve',
                            function(Resolve) {
                                return Resolve.ClassRoster();
                            }
                        ],
                        CalendarEvents: ['Resolve',
                            function(Resolve) {
                                return Resolve.CalendarEvents();
                            }
                        ]
                    }
                })
                .when('/classes/:classId/calendar/:itemId', {
                    controller: 'CalendarEventCtrl',
                    templateUrl: PATH.TEMPLATE_ROOT + '/app/classes/calendar/calendarEvent/calendarEvent.html',
                    resolve: {
                        _security: secureRoute,
                        ClassRosters: ['Resolve',
                            function(Resolve) {
                                return Resolve.ClassRosters();
                            }
                        ],
                        CurrentRoster: ['Resolve',
                            function(Resolve) {
                                return Resolve.ClassRoster();
                            }
                        ],
                        myCalendarEvent: ['Resolve', '$route', 'AssignmentFacadeService', 'CalendarService',
                            function(Resolve, $route, AssignmentFacadeService, CalendarService) {
                                return CalendarService.getEventDetails($route.current.params.itemId,
                                    $route.current.params.eventType).then(function(eventResult) {

                                        if (eventResult && eventResult.eventType === 'ASSIGNMENT') {
                                            var assignmentId = eventResult.id;
                                            return AssignmentFacadeService.getAllAssignedTos(assignmentId).then (
                                                function(assignedList) {
                                                    assignedList = _.filter(assignedList, function(assignedTo) {
                                                        return assignedTo.classUuid === $route.current.params.classId;
                                                    });
                                                    eventResult.assignedTo = assignedList;
                                                    return eventResult;
                                                });
                                        } else {
                                            return eventResult;
                                        }
                                    });
                            }
                        ],
                        GroupData: ['Resolve',
                            function(Resolve) {
                                return Resolve.GroupList();
                            }
                        ]
                    }
                })
                .when('/classes/:classId/calendar/:assignmentId/content/:itemId/:itemVersion', ContentViewerConfig)
                .when('/classes/:classId/calendar/:assignmentId/preview', AssignmentPreviewConfig)
                .when('/classes/:classId/calendar/:assignmentId/preview/content/:itemId/:itemVersion',
                ContentViewerConfig)
                .when('/classes/:classId/students', StudentsListConfig)
                .when('/deeplink/classes/:classId/students', StudentsListConfig);
        }
    ]);
