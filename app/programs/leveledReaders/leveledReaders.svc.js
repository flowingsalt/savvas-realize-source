angular.module('Realize.leveledReaders.leveledReadersSvc', [
    'rlzComponents.components.i18n',
    'Realize.leveledReaders.leveledReadersScale',
    'Realize.paths',
    'Realize.constants.draTelemetry'
])
    .service('LeveledReadersSvc', [
        '$log',
        'LeveledReadersScale',
        'Messages',
        '$http',
        'REST_PATH',
        '$location',
        '$route',
        '$rootScope',
        'DRA_TELEMETRY',
        function($log, LeveledReadersScale, Messages, $http, REST_PATH, $location, $route, $rootScope, DRA_TELEMETRY) {
            'use strict';

            var TYPES = LeveledReadersScale.TYPES,
                TYPE_LIST = LeveledReadersScale.TYPE_LIST,
                TIC_INDEXES_BY_TYPE = LeveledReadersScale.TIC_INDEXES_BY_TYPE,
                ROUTE_PARAM = this.ROUTE_PARAM = {
                SCALE_TYPE: 'scaleType',
                START: 'scaleStart',
                END: 'scaleEnd'
            };

            var LEXILE = 'Lexile';
            var BR = 'BR';

            var getMap = function(helperValues) {
                //returns map of types to helperValues
                return _.object(TYPE_LIST, helperValues);
            };

            var getLeveledReader = function(type) {
                var keyCodesByType = getMap(['lexile', 'guided', 'dra', 'maturity']);

                return new LeveledReadersScale(type)
                    .$setTitle(Messages.getMessage('leveledReaders.scales.' + keyCodesByType[type] + '.title'))
                    .$setDescription(Messages.getMessage('leveledReaders.scales.' +
                    keyCodesByType[type] + '.description'));
            };

            this.getScale = function(type) {
                var restPathsByType = getMap(['Lexiles', 'GuidedReadings',
                    'DevelopmentalReadingAssessments', 'ReadingMaturityMetrics']);

                return $http.get(REST_PATH + '/metadata/values/' + restPathsByType[type], {cache: true})
                    .then(function(response) {

                        if (type === LEXILE) {
                            var brIndex = response.data.indexOf(BR);
                            response.data[brIndex] = ' ' + response.data[brIndex];
                        }

                        return getLeveledReader(type)
                            .$setScaleValues(response.data)
                            .$setTicLabelsToDisplay(TIC_INDEXES_BY_TYPE[type]);

                    }, $rootScope.goToDefaultErrorPage);
            };

            this.getScales = function() {
                return $http.get(REST_PATH + '/metadata/scales', {cache: true}).then(function(response) {
                    var scaleValues = response.data;

                    var brIndex = scaleValues.Lexiles.indexOf(BR);
                    scaleValues.Lexiles[brIndex] = ' ' + scaleValues.Lexiles[brIndex];

                    var lexile = getLeveledReader(TYPES.LEXILE)
                            .$setScaleValues(scaleValues.Lexiles)
                            .$setTicLabelsToDisplay(TIC_INDEXES_BY_TYPE[TYPES.LEXILE]),

                        guidedReading = getLeveledReader(TYPES.GUIDED)
                            .$setScaleValues(scaleValues.GuidedReadings)
                            .$setTicLabelsToDisplay(TIC_INDEXES_BY_TYPE[TYPES.GUIDED]),

                        dra = getLeveledReader(TYPES.DRA)
                            .$setScaleValues(scaleValues.DevelopmentalReadingAssessments)
                            .$setTicLabelsToDisplay(TIC_INDEXES_BY_TYPE[TYPES.DRA]),

                        maturity = getLeveledReader(TYPES.RMM)
                            .$setScaleValues(scaleValues.ReadingMaturityMetrics)
                            .$setTicLabelsToDisplay(TIC_INDEXES_BY_TYPE[TYPES.RMM]);

                    return [lexile, guidedReading, dra, maturity];
                }, $rootScope.goToDefaultErrorPage);
            };

            this.redirectToSearchPage = function(selectedScale) {
                var searchLeveledReadersPath = ['/program', $route.current.params.programId,
                    $route.current.params.programVersion, 'leveledreaders', 'search'].join('/');

                $location.path(searchLeveledReadersPath);

                this.updateRouteParams(selectedScale);
            };

            this.updateRouteParams = function(selectedScale) {
                var routeParams = {};
                routeParams[ROUTE_PARAM.SCALE_TYPE] = selectedScale.type;
                routeParams[ROUTE_PARAM.START] = selectedScale.selected.start.trim();
                routeParams[ROUTE_PARAM.END] = selectedScale.selected.end.trim();

                $location.search(routeParams);
            };

            this.getScaleTypeFromRoute = function() {
                return $route.current.params[ROUTE_PARAM.SCALE_TYPE];
            };

            this.getScaleStartFromRoute = function() {
                return $route.current.params[ROUTE_PARAM.START];
            };

            this.getScaleEndFromRoute = function() {
                return $route.current.params[ROUTE_PARAM.END];
            };

            this.getQueryParam = function(scale) {
                var startValue = scale.selected.start || this.getScaleStartFromRoute(),
                    endValue =  scale.selected.end || this.getScaleEndFromRoute(),
                    selectedType = scale.type || this.getScaleTypeFromRoute();

                if (!selectedType || !startValue || !endValue) {
                    $log.error('LeveledReadersSvc: Cannot build query without scaleType, start, end');
                }

                var queryParamByType, selectedKey, selectedValue, leveledReadersParam;
                startValue = startValue.trim();
                endValue = endValue.trim();

                queryParamByType = getMap(['LEXILE', 'GUIDED_READING', 'DRA', 'READING_MATURITY_METRIC']);

                selectedKey = queryParamByType[selectedType];
                selectedValue = (startValue === endValue) ? startValue : (startValue + '-' + endValue);

                leveledReadersParam = {};
                leveledReadersParam[selectedKey] = selectedValue;
                return leveledReadersParam;
            };

            this.getProgramTitle = function() {
                return $rootScope.currentProgram && $rootScope.currentProgram.programs &&
                    $rootScope.currentProgram.programs[0] ? $rootScope.currentProgram.programs[0] :
                    DRA_TELEMETRY.DRA_PRODUCT_NOT_AVAILABLE;
            };

        }]);
