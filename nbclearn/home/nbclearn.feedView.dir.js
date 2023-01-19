angular.module('Realize.NbcLearn.FeedView', [
    'Realize.rss.RssSvc',
    'Realize.paths',
    'Realize.NbcLearn.Constants'
])
.directive('nbcLearnFeedView', [
    '$log',
    '$location',
    'NBCLEARN_ID',
    'RssSvc',
    function($log, $location, NBCLEARN_ID, RssSvc) {
        'use strict';

        return {
            scope: {},
            templateUrl: 'templates/nbclearn/home/nbclearn.feedView.dir.html',
            link: function(scope) {
                scope.loading = true;

                scope.more = function() {
                    $location.path('/nbclearn/browse');
                };

                scope.open = function(e, item) {
                    $location.url('/nbclearn/article/' + item.id);
                };

                RssSvc.query(NBCLEARN_ID, {'start': 0, 'count': 4}).then(function(data) {
                    scope.loading = false;
                    scope.rssItems = data.items;
                });
            }
        };
    }
]);
