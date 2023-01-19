angular.module('Realize.Discussions.CustomPostSummary', [
    'Discuss.PostSummary'
])
.config(['$provide', function($provide) {
    'use strict';
    $provide.decorator('postSummaryDirective', ['$delegate',
        function($delegate) {
            var directive = $delegate[0], //get original directive
                templateUrlOriginal,
                linkOriginal;

            templateUrlOriginal = directive.templateUrl;

            linkOriginal = directive.link;

            //override with new template
            delete directive.templateUrl;
            directive.template = function() {
                return [
                    '<div inline-notification-row-target=".post"',
                        'inline-notification="post.id"',
                        'inline-notification-target=".post-main"',
                        'ng-include="templateUrlOriginal"',
                    '></div>'
                ].join('');
            };

            directive.compile = function() {
                var linkNew = function(scope) {
                    // new template ng-includes original template so that we don't have to maintain the
                    // entire template in 2 places
                    scope.templateUrlOriginal = templateUrlOriginal;

                    if (angular.isDefined(linkOriginal)) {
                        linkOriginal.apply(this, arguments); //execute original link function
                    }
                };

                return linkNew;
            };

            return $delegate;
        }
    ]);
}]);
