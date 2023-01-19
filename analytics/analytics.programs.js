angular.module('Realize.analytics.programs', [
    'realize-lib.analytics',
    'realize-lib.analytics.google',
    'realize-lib.analytics.track-click'
])
    .config([
        'AnalyticsProvider',
        function(AnalyticsProvider) {
            'use strict';

            AnalyticsProvider.addTracker('programs.list.sort', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    var actions = {
                            subject: 'Show by Subject',
                            grade: 'Show by Grade',
                            favorite: 'Show by Favorites'
                        };

                    GoogleAnalytics.trackEvent(
                        'Programs',
                        actions[AnalyticsEvent.action]
                    );
                }
            ]);

            AnalyticsProvider.addTracker('programs.open', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    if (!AnalyticsEvent.program) { return; }
                    GoogleAnalytics.trackEvent(
                        'Programs',
                        'Program (' + AnalyticsEvent.program.title + ')'
                    );
                }
            ]);

            AnalyticsProvider.addTracker('programs.action', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    if (!AnalyticsEvent.program) { return; }

                    var eventLabel = AnalyticsEvent.label;

                    if (AnalyticsEvent.content && AnalyticsEvent.content.id !== AnalyticsEvent.program.id) {
                        eventLabel = 'Asset (' + AnalyticsEvent.content.$getTitle() + '): ' + eventLabel;
                    }

                    GoogleAnalytics.trackEvent(
                        'Programs',
                        'Program (' + AnalyticsEvent.program.title + ')',
                        eventLabel
                    );
                }
            ]);

            AnalyticsProvider.addTracker('programs.info', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    if (!AnalyticsEvent.program || !AnalyticsEvent.item) { return; }

                    var eventLabel = 'Info (' + AnalyticsEvent.item.$getTitle() + ')';

                    if (AnalyticsEvent.content && AnalyticsEvent.content.id !== AnalyticsEvent.program.id) {
                        eventLabel = 'Asset (' + AnalyticsEvent.content.$getTitle() + '): ' + eventLabel;
                    }

                    GoogleAnalytics.trackEvent(
                        'Programs',
                        'Program (' + AnalyticsEvent.program.title + ')',
                        eventLabel
                    );
                }
            ]);

            AnalyticsProvider.addTracker('programs.teacherResources', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    if (!AnalyticsEvent.program || !AnalyticsEvent.item) { return; }

                    var eventLabel = 'Teacher Resources (' + AnalyticsEvent.item.$getTitle() + ')';

                    if (AnalyticsEvent.content && AnalyticsEvent.content.id !== AnalyticsEvent.program.id) {
                        eventLabel = 'Asset (' + AnalyticsEvent.content.$getTitle() + '): ' + eventLabel;
                    }

                    GoogleAnalytics.trackEvent(
                        'Programs',
                        'Program (' + AnalyticsEvent.program.title + ')',
                        eventLabel
                    );
                }]);

            AnalyticsProvider.addTracker('programs.contentQuicklink', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    if (!AnalyticsEvent.program || !AnalyticsEvent.content || !AnalyticsEvent.label) { return; }

                    var eventLabel = 'Asset (' + AnalyticsEvent.content.$getTitle() + '): ' + AnalyticsEvent.label;
                    GoogleAnalytics.trackEvent(
                        'Programs',
                        'Program (' + AnalyticsEvent.program.title + ')',
                        eventLabel
                    );
                }
            ]);

        }
    ]);
