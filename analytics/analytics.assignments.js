angular.module('Realize.analytics.assignments', [
    'realize-lib.analytics',
    'realize-lib.analytics.google',
    'realize-lib.analytics.track-click'
])
    .config([
        'AnalyticsProvider',
        function(AnalyticsProvider) {
            'use strict';

            AnalyticsProvider.addTracker('assignment.action', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    if (!AnalyticsEvent.status || !AnalyticsEvent.assignment) { return; }

                    var status = {
                            completed: 'Completed',
                            in_progress: 'In Progress',
                            not_started: 'Not Started'
                        },
                        category = AnalyticsEvent.category ? AnalyticsEvent.category : 'Classes',
                        eventStatus = status[AnalyticsEvent.status] + '- ' + AnalyticsEvent.assignment.$getTitle(),
                        action = AnalyticsEvent.action ? AnalyticsEvent.action : eventStatus,
                        label = AnalyticsEvent.label;

                    if (label) {
                        GoogleAnalytics.trackEvent(
                            category,
                            action,
                            label
                        );
                    } else {
                        GoogleAnalytics.trackEvent(
                            'Classes',
                            status[AnalyticsEvent.status] + '- ' + AnalyticsEvent.assignment.$getTitle()
                        );
                    }
                }
            ]);
        }
    ]);
