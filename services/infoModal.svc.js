angular.module('RealizeApp')
    .service('InfoModalService', [
        '$log',
        '$location',
        'Messages',
        '$rootScope',
        function($log, $location, Messages, $rootScope) {
            'use strict';

            var BR = 'BR';
            var L = 'L';

            var service = this,
                levelsArray = [];

            service.hideInfoItem = function(infoItem) {
                var isEmptyArray =  _.isArray(infoItem) && _.isEmpty(infoItem.join('').trim()),
                    isEmptyString =  _.isString(infoItem) && infoItem.trim().length === 0;
                return angular.isUndefined(infoItem) || isEmptyArray || isEmptyString;
            };

            service.isCustomerAdmin = function() {
                return $rootScope.currentUser.isCustomerAdmin;
            };

            service.hideInfoItemFromStudent = function(infoItem) {
                return service.hideInfoItem(infoItem) || $rootScope.currentUser.isStudent;
            };

            service.hideInfoItemOnLevels  = function() {
                return service.hideInfoItemFromStudent(levelsArray);
            };

            var createScaleInfo = function(infoItem, message) {
                if (!service.hideInfoItemFromStudent(infoItem)) {
                    levelsArray.push(message + ': ' + infoItem);
                }
            };

            var formatLexileScaleValues = function(item) {
                if (item.lexile) {
                    var lexileArray = item.lexile.split(',');
                    for (var lexile = 0; lexile < lexileArray.length; lexile++) {
                        if (lexileArray[lexile] === BR ||
                            lexileArray[lexile].substr(lexileArray[lexile].length - 1,
                                lexileArray[lexile].length) === L) {
                            continue;
                        }
                        lexileArray[lexile] = parseInt(lexileArray[lexile]) < 0 ?
                            BR + lexileArray[lexile].substr(1) + L : lexileArray[lexile] + L;
                    }
                    item.lexile = lexileArray.join(',');
                }
                return item.lexile;
            };

            service.createLevelsArray = function(item) {
                levelsArray = [];
                createScaleInfo(formatLexileScaleValues(item), Messages.getMessage('program.info.levels.lexile'));
                createScaleInfo(item.guidedReading, Messages.getMessage('program.info.levels.guidedReading'));
                createScaleInfo(
                    item.readingMaturityMetric,
                    Messages.getMessage('program.info.levels.readingMaturityMetric')
                );
                createScaleInfo(item.developmentalReadingAssessment, Messages.getMessage('program.info.levels.dra'));
                createScaleInfo(item.quantile, Messages.getMessage('program.info.levels.quantile'));
                return levelsArray.join('; ');
            };

            service.navigateToSourceProgram = function(url) {
                // remove search query param and navigate to breadcrumb path
                $location.search('keywords', null);
                $location.path(url);
            };
        }
    ]);
