(function(angular) {
    'use strict';
    function lstSearch($q) {
        var config = {
            restrict: 'E',
            templateUrl: 'lst/ui/templates/lstSearchWidget.dir.html',
            scope: {
                searchKeywordTitle: '@',
                searchButtonName: '@',
                doSearch: '&',
                doReset: '&',
                initialSearchKeyword: '=?'
            },
            link: function(scope) {

                var resetButton = function() {
                    scope.showSearchButton = !scope.showSearchButton;
                },
                afterSearch = function() {
                    scope.disableSearchButton = false;
                    resetButton();
                    scope.searchWidgetForm.$setPristine();
                };

                scope.showSearchButton = true;
                scope.disableSearchButton = false;

                scope.search = function() {
                    scope.disableSearchButton = true;
                    return $q.when(scope.doSearch({searchKeyword: scope.searchKeyword}))
                        .finally(afterSearch);
                };

                scope.reset = function() {
                    scope.searchKeyword = '';
                    return $q.when(scope.doReset())
                        .finally(function() {
                            scope.$emit('lstSearch.searchWidget.triggered.reset');
                            resetButton();
                        });
                };

                scope.changeButton = function() {
                    scope.showSearchButton = true;
                };

                scope.onFocusOut = function() {
                    if (scope.searchKeyword === '') {
                        scope.reset();
                        return;
                    }
                };

                if (scope.initialSearchKeyword) {
                    scope.searchKeyword = scope.initialSearchKeyword;
                    scope.search();
                }
            }
        };

        return config;
    }

    angular.module('lst.search.widget', ['lst.search.widget.ui.templates'])
        .directive('lstSearch', ['$q', lstSearch]);
})(angular);
