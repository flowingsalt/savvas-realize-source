angular.module('Realize.NbcLearn', [
    'Realize.content.fullscreenPlayer',
    'Realize.content.model.contentItem',
    'Realize.rss.RssSvc',
    'Realize.NbcLearn.Constants',
    'Realize.NbcLearn.browse',
    'Realize.NbcLearn.article',
    'Realize.NbcLearn.FeedView',
    'Realize.NbcLearn.NbcLearnService',
    'Realize.NbcLearn.content.content',
    'Realize.NbcLearn.content.viewer',
    'RealizeDataServices'
])
.config([
    '$routeProvider',
    'REST_PATH',
    'RssSvcProvider',
    'NbcLearnServiceProvider',
    function($routeProvider, REST_PATH, RssSvcProvider, NbcLearnServiceProvider) {
        'use strict';

        var VideoViewerConfig = {
            controller: 'NbcLearnVideoPlayerCtrl',
            templateUrl: 'templates/nbclearn/content/viewer.html',
            resolve: {
                content: ['Content', '$route', function(Content, $route) {
                    return Content.get({contentId: $route.current.params.contentId,
                        version: $route.current.params.contentVersion}, true, true);
                }]
            }
        };

        RssSvcProvider.setUrl(REST_PATH + '/rss/feed/');
        NbcLearnServiceProvider.setEmbedPath(REST_PATH + '/nbc/learn/embedurl');

        $routeProvider
            .when('/nbclearn/video/:contentId', VideoViewerConfig)
            .when('/nbclearn/video/:contentId/:contentVersion', VideoViewerConfig)
            .when('/nbclearn/classes/:classUuid/assignments/:assignmentId/video/:contentId/:contentVersion',
                VideoViewerConfig)
            .when('/nbclearn/browse', {
                controller: 'NBCLearnBrowseCtrl',
                controllerAs: 'nbcLearnBrowseCtrl',
                templateUrl: 'templates/nbclearn/browse/nbclearn.browse.view.html',
                resolve: {
                    UserData: [
                        '$rootScope',
                        'User',
                        function($rootScope, User) {
                            return User.getCurrentUser();
                        }
                    ]
                }
            })
            .when('/nbclearn/article/:articleId', {
                controller: 'nbcLearnArticleCtrl',
                templateUrl: 'templates/nbclearn/article/nbclearn.article.view.html',
                resolve: {
                    NBCArticleData: [
                        'RssSvc',
                        'NBCLEARN_ID',
                        '$route',
                        '$q',
                        'NbcLearnService',
                        function(RssSvc, NBCLEARN_ID, $route, $q, NbcLearnService) {
                            var deferred = $q.defer();

                            RssSvc.get(NBCLEARN_ID, $route.current.params.articleId).then(
                                function(articleData) {
                                    NbcLearnService.getEmbedUrl(articleData.link).then(
                                        function(embedUrl) {
                                            deferred.resolve({
                                                embedUrl: embedUrl,
                                                article: articleData
                                            });
                                        },
                                        deferred.reject
                                    );
                                },
                                deferred.reject
                            );

                            return deferred.promise;
                        }
                    ]
                }
            });
        // end $routeProvder
    }
]);
