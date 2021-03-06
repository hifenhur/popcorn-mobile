(function(App) {
    "use strict";
//    var querystring = require("querystring");
//    var request = require('request');
//    var Q = require('q');

    var URL = false;
    var Yts = function() {};

    Yts.prototype.constructor = Yts;

    var queryTorrents = function(filters) {
        
        var deferred = Q.defer();
		
        var params = {};
        params.sort = 'seeds';
        params.limit = '50';

        if (filters.keywords) {
            params.keywords = filters.keywords.replace(/\s/g, '% ');
        }

        if (filters.genre) {
            params.genre = filters.genre;
        }

        if(filters.order) {
            var order = 'desc';
            if(filters.order === 1) {
                order = 'asc';
            }
            params.order = order;
        }

        if (filters.sorter && filters.sorter !== 'popularity') {
            params.sort = filters.sorter;
        }

        if (filters.page) {
            params.set = filters.page;
        }

        if (Settings.movies_quality !== 'all') {
            params.quality = Settings.movies_quality;
        }
		
        var url = Settings.yifyApiEndpoint + 'list.json?' + querystring.stringify(params).replace(/%E2%80%99/g,'%27');
		
        win.info('Request to YTS API');
        win.debug(url);
        $.get(url, function(data, status, jqXHR) {
            if(status != "success") {
                deferred.reject(error);
            } else if(!data || (data.error && data.error !== 'No movies found')) {
                var err = data? data.error: 'No data returned';

                console.error('YTS error:', err);
                deferred.reject(err);
            } else {
                deferred.resolve(data.MovieList || []);
            }
        });

        return deferred.promise;
    };

    var formatForPopcorn = function(items) {

        var movies = {};
        var movieList = [];
        _.each(items, function(movie) {
            if(movie.Quality === '3D') { return; }
            var largeCover = movie.CoverImage.replace(/_med\./, '_large.');

            var imdb = movie.ImdbCode.replace('tt', '');

            // Calc torrent health
            var seeds = movie.TorrentSeeds;
            var peers = movie.TorrentPeers;

            var torrents = {};
            torrents[movie.Quality] = {
                url: movie.TorrentUrl,
                size: movie.SizeByte,
                seed: seeds,
                peer: peers
            };

            var ptItem = movies[imdb];
            if(!ptItem) {
                ptItem = {
                    imdb:       imdb,

                    title:      movie.MovieTitleClean.replace(/\([^)]*\)|1080p|DIRECTORS CUT|EXTENDED|UNRATED|3D|[()]/g, ''),
                    year:       movie.MovieYear,

                    MovieRating: movie.MovieRating,

                    image:      largeCover,
                    bigImage:   largeCover,
                    torrents:   torrents
                };

                movieList.push(ptItem);
            } else {
                _.extend(ptItem.torrents, torrents);
            }

            movies[imdb] = ptItem;
        });

        return movieList;
    };

    Yts.prototype.extractIds = function(items) {
        return _.pluck(items, 'imdb');
    };

    Yts.prototype.fetch = function(filters) {
        return queryTorrents(filters)
            .then(formatForPopcorn);
    };

    App.Providers.Yts = Yts;

})(window.App);