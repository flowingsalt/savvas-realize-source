angular.module('Realize.analytics', [
    'realize-lib.analytics',
    'realize-lib.analytics.google',
    'realize-lib.analytics.track-click',
    'Realize.analytics.programs',
    'Realize.analytics.centers',
    'Realize.analytics.assignments',
    'components.utilities.sha256',
    'Realize.user.currentUser'
])
    .constant('ANALYTIC_CONSTANTS', {
        STANDARD_THEME: 'Standard'
    })
    .config([
        'GoogleAnalyticsProvider',
        function(GoogleAnalyticsProvider) {
            'use strict';

            GoogleAnalyticsProvider.setProfile(window.googleAnalyticsId);
            GoogleAnalyticsProvider.setDevMode(true);
            // disable Google analytics
            // var disableId = 'ga-disable-' + window.googleAnalyticsId;
            // window[disableId] = true;
        }
    ])
    .config([
        'AnalyticsProvider',
        function(AnalyticsProvider) {
            'use strict';

            AnalyticsProvider.addTracker('track.action', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    GoogleAnalytics.trackEvent(AnalyticsEvent.category, AnalyticsEvent.action, AnalyticsEvent.label);
                }
            ]);
        }
    ])
    .run([
        'GoogleAnalytics',
        'ANALYTIC_CONSTANTS',
        'sha256',
        '$currentUser',
        function(GoogleAnalytics, ANALYTIC_CONSTANTS, sha256, $currentUser) {
            'use strict';

            GoogleAnalytics.trackPageview();
            GoogleAnalytics.setOptions({
                dimension1: $currentUser.primaryOrgRole,
                dimension2: $currentUser.primaryOrgId,
                dimension4: ANALYTIC_CONSTANTS.STANDARD_THEME,
                // added the default empty string to fix build failure
                userId: sha256($currentUser.userId || '')
            });
        }
    ]);
