angular.module('Realize.admin', [
        'RealizeDataServices',
        'Realize.admin.landing.adminLandingController',
        'Realize.admin.programs.addProgramController',
        'Realize.admin.jobs.adminJobsListingController',
        'Realize.admin.programs.existingProgramsController',
        'Realize.admin.messages.adminMessagesEditorController',
        'Realize.admin.programs.programTaxonomyService',
        'Realize.admin.commonCartridge',
        'Realize.admin.ltiConsumer',
        'Realize.admin.adminJobsService',
        'Realize.admin.publish.publishTipFilter',
        'Realize.admin.publish.publishClick'
    ])
    .config([
        '$routeProvider',
        function($routeProvider) {
            'use strict';

            // all of the back end should be protected, this is just for posterity
            // TODO: use permissions service
            var secureRoute = [
                '$q',
                '$rootScope',
                function($q, $rootScope) {
                    var allowed = $rootScope.currentUser.hasRole('ROLE_LIBRARY_ADMIN') ||
                        $rootScope.currentUser.hasRole('ROLE_OLE_GOD') ||
                        $rootScope.currentUser.hasRole('ROLE_CACHE_GOD') ||
                        $rootScope.currentUser.hasRole('ROLE_PEARSON_ADMIN');

                    if (!allowed) {
                        return $q.reject('Insufficient Privledges!');
                    }

                    return $q.when(1);
                }
            ];

            $routeProvider
                .when('/admin/patools/messages', {
                    controller: 'AdminMessagesEditorController',
                    templateUrl: 'templates/admin/messages/adminMessagesEditor.html',
                    resolve: {
                        _security: secureRoute
                    }
                })
                .when('/admin/patools', {
                    controller: 'AdminLandingController',
                    templateUrl: 'templates/admin/landing/adminLanding.html',
                    resolve: {
                        _security: secureRoute
                    }
                })
                .when('/admin/patools/addprogram', {
                    controller: 'AdminAddProgramController',
                    templateUrl: 'templates/admin/programs/adminAddProgram.html',
                    resolve: {
                        _security: secureRoute
                    }
                })
                .when('/admin/patools/existingprograms', {
                    controller: 'ExistingProgramsController',
                    templateUrl: 'templates/admin/programs/existingPrograms.html',
                    resolve: {
                        _security: secureRoute,
                        ProgramData: [
                            'ProgramTaxonomyService',
                            function(ProgramTaxonomyService) {
                                return ProgramTaxonomyService.getAllPrograms();
                            }
                        ]
                    }
                })
                .when('/admin/patools/jobservicelisting', {
                    controller: 'AdminJobsListingController',
                    controllerAs: 'adminJobsListing',
                    templateUrl: 'templates/admin/jobs/adminJobsListing.html',
                    resolve: {
                        _security: secureRoute,
                        JobsData: [
                            'AdminJobsService',
                            '$currentUser',
                            function(AdminJobsService, $currentUser) {
                                return AdminJobsService.getJobs({
                                    state: 'active',
                                    SUBMITTED_BY_USERID: $currentUser.userName,
                                    getMinimalJobDetailsAttributes: true
                                });
                            }
                        ],
                        lastSearch: [
                            '$currentUser',
                            function($currentUser) {
                                return {
                                    type: 'filters',
                                    filters: {
                                        state: 'active',
                                        SUBMITTED_BY_USERID: $currentUser.userName,
                                        getMinimalJobDetailsAttributes: true
                                    }
                                };
                            }
                        ]
                    }
                })
                .when('/admin/patools/jobservicelisting/:jobId', {
                    controller: 'AdminJobsListingController',
                    controllerAs: 'adminJobsListing',
                    templateUrl: 'templates/admin/jobs/adminJobsListing.html',
                    resolve: {
                        _security: secureRoute,
                        JobsData: [
                            'AdminJobsService',
                            '$route',
                            '$log',
                            function(AdminJobsService, $route, $log) {
                                var jobId = $route.current.params.jobId;

                                return AdminJobsService.getJobById(jobId)
                                    .then(function(jobs) {
                                        return jobs;
                                    }, function(err) {
                                        // assume 404
                                        $log.debug('error getting jobs!', err);
                                        return [];
                                    });
                            }
                        ],
                        lastSearch: [
                            '$route',
                            function($route) {
                                return {
                                    type: 'id',
                                    searchId: $route.current.params.jobId
                                };
                            }
                        ]
                    }
                })
                .when('/admin/patools/commoncartridge/:activeTab', {
                    controller: 'AdminCommonCartridgeManagementController',
                    templateUrl: 'templates/admin/commonCartridge/cartridgeManagement.html',
                    resolve: {
                        _security: secureRoute
                    }
                })
                .when('/admin/patools/ltiConsumer/:activeTab', {
                    controller: 'AdminLTIConsumerConfigController',
                    controllerAs: 'ltiConfigCtrl',
                    templateUrl: 'templates/admin/ltiConsumer/ltiConsumerConfig.html',
                    resolve: {
                        _security: secureRoute
                    }
                });
        }
    ]);
