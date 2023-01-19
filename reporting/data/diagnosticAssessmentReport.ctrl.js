angular
    .module('Realize.reporting.data.DiagnosticAssessmentReportCtrl', [
        'RealizeDataServices',
        'Realize.reporting.MasteryByAssignmentService',
        'Realize.analytics',
    ])
    .config(['AnalyticsProvider',
        function(AnalyticsProvider) {
            'use strict';
            AnalyticsProvider.addTracker('track.diagnosticAssessmentReport', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    GoogleAnalytics.trackEvent('Data', 'Mastery report data', AnalyticsEvent.label);
                },
            ]);
        },
    ])
    .controller('DiagnosticAssessmentReportCtrl', [
        '$scope',
        'featureManagementService',
        function($scope, featureManagementService) {
            'use strict';
            $scope.isAssessmentMaintenancePageEnabled = featureManagementService.isAssessmentMaintenancePageEnabled();
        },
    ]);
