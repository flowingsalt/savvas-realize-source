angular.module('Realize.assignment.teacher.notebook.notebookConfig', [
    'Realize.assignment.teacher.notebook.constants',
    'NotebookApp',
    'ngRoute',
    'Realize.common.tokenRecovery'
])

.factory('NotebookInterceptor', ['$injector', '$log', '$q', 'NOTEBOOK_CONSTANTS', '$window', '$rootScope',
    function($injector, $log, $q, NOTEBOOK_CONSTANTS, $window, $rootScope) {
        'use strict';
        return {
            request: function(config) {
                if (config.url.indexOf($window.notebookServiceUrl) > -1) {
                    var notebookTokenService = $injector.get('NotebookTokenService');
                    config.service = NOTEBOOK_CONSTANTS.APP_NAME;
                    return notebookTokenService.getToken().then(function(token) {
                        config.headers.Authorization = 'Bearer ' + token;
                        if (NOTEBOOK_CONSTANTS.CONFIG.POST === config.method) {
                            config.headers['Content-Type'] = NOTEBOOK_CONSTANTS.CONFIG.CONTENT_TYPE;
                            config.transformRequest = function(data) {
                                return JSON.stringify(data);
                            };
                        }
                        return config;
                    });
                } else {
                    return config;
                }
            },

            responseError: function(response) {
                if ((response.config.url.indexOf($window.notebookServiceUrl) > -1) &&
                    response.status !== NOTEBOOK_CONSTANTS.HTTP_UNAUTHORISED &&
                    response.status !== NOTEBOOK_CONSTANTS.HTTP_PAGE_NOT_FOUND) {
                    $rootScope.$emit('notebook.server.error');
                }
                return $q.reject(response);
            }
        };
    }
])

.config([
    'NotebookConfigProvider',
    '$httpProvider',
    'NOTEBOOK_CONSTANTS',
    '$windowProvider',
    '$routeProvider',
    'CommonTokenRecoveryProvider',
    function(NotebookConfigProvider, $httpProvider, NOTEBOOK_CONSTANTS, $windowProvider, $routeProvider,
        CommonTokenRecoveryProvider) {
        'use strict';
        var $window = $windowProvider.$get(),
            TEMPLATE_CACHE = 'templates';

        var awsAppsyncConfig = {
            'aws_project_region': $window.appsyncAwsProjectRegion,
            'aws_appsync_graphqlEndpoint': $window.appsyncAwsGraphqlEndpoint,
            'aws_appsync_region': $window.appsyncAwsRegion,
            'aws_appsync_authenticationType': $window.appsyncAwsAuthenticationType,
            'aws_appsync_apiKey': $window.appsyncAwsApiKey
        };
        var configObj = {
            awsConfig: awsAppsyncConfig,
            models: ['Note'],
            mode: 'API'
        };

        NotebookConfigProvider.set('domainPath', $window.notebookServiceUrl);
        NotebookConfigProvider.set('maxPromptsPerPageForPagination', NOTEBOOK_CONSTANTS.ENTRIES_PER_PAGE);
        NotebookConfigProvider.set(NOTEBOOK_CONSTANTS.CONFIG.ENABLE_MULTI_SORT_PROMPTS, true);
        NotebookConfigProvider.set(NOTEBOOK_CONSTANTS.CONFIG.DEFAULT_SORT_PROMPTS_BY, 'questionOrder');
        var enableNotebookAppsyncIntegration = $window.currentUser.featureAttributes ?
            $window.currentUser.featureAttributes['show.notebook.appsync.integration'] : 'OFF';
        if ($window.UserActivityCore && enableNotebookAppsyncIntegration === 'ON') {
            $window.UserActivityCore.configure(configObj);
            var noteBookAdapter = $window.UserActivityCore.NoteBook();
            NotebookConfigProvider.set('appSyncAdapter', noteBookAdapter);
        } else {
            $httpProvider.interceptors.push('NotebookInterceptor');
        }
        CommonTokenRecoveryProvider.registerTokenProvider('NotebookTokenService');

        $routeProvider
            .when('/classes/:classId/assignments/:assignmentId/allstudents/:userAssignmentId/review', {
                controller: 'NotebookCtrl',
                controllerAs: 'nbCtrl',
                templateUrl: TEMPLATE_CACHE + '/assignment/teacher/notebook/notebook.ctrl.html',
                resolve: {
                    resolveClassAndAssignmentData: ['Resolve',
                        function(Resolve) {
                            return Resolve.TeacherSingleAssignment();
                        }
                    ],
                    resolveGroupData: ['Resolve',
                        function(Resolve) {
                            return Resolve.GroupList();
                        }
                    ]
                }
            });
    }
]);
