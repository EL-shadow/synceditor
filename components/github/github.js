/**
 *
 * @param {jQuery} $
 * @param {AlertPopup.alert} popup
 * @constructor
 */
var GitHubAPI = function ($, popup) {
    this._currentToken = '';
    this._currentUserLogin = '';

    /**
     * Возвращает тексты из папки
     * @param directoryURL
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    this.checkoutTexts = function(directoryURL){
        var textsLoading = $.Deferred();
        var ghAPIgetFile = this.getFile.bind(this);

        this
            .getFolderContent(directoryURL)
            .done(function (files) {
                var fileNames = Object.keys(files);

                // Вызывае when через apply чтобы передать массивом загрузчики
                $.when.apply($, fileNames.map(function (fileName) {
                    var fileUrl = files[fileName];

                    return ghAPIgetFile(fileUrl);
                })).done(function () {
                    if (fileNames.length !== arguments.length) {
                        textsLoading.reject('Ошибка загрузки файлов [ghAPI:checkoutTexts]');
                        return;
                    }

                    var allFiles = Array.prototype.reduce.call(arguments, function (allFilesContent, fileContent, index) {
                        var fileName = fileNames[index];

                        allFilesContent[fileName] = fileContent[0];

                        return allFilesContent;
                    }, {});

                    textsLoading.resolve(allFiles);
                }).fail(function () {
                    textsLoading.reject('Ошибка загрузки всех файлов');
                })
            })
            .fail(function () {
                textsLoading.reject('Ошибка загрузки директории [' + directoryURL + ']');
            });

        return textsLoading.promise();
    };

    /**
     * Возвращает jQuery promise и при успешном результате данные в формате имя_файла=url
     * @param directoryURL
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    this.getFolderContent = function(directoryURL) {
        popup('Загружается список переводов...', 'info');
        return $.get(directoryURL)
            .then(function (data) {
                var filesCount = data && data.length;
                var files;
                var allFileNames;

                if (filesCount) {
                    files = data.reduce(function (acc, file) {
                        acc[file.name] = file.download_url;

                        return acc;
                    }, {});

                    allFileNames = Object.keys(files).join('<br>');
                    popup('Найдено '+ filesCount + ':<br>' + allFileNames, 'success');

                    return files;
                }
            }, function () {
                popup('Не удалось загрузить ' + url, 'danger');
            });
    };

    this.getFile = function(fileURL) {
        return $.get(fileURL);
    };

    /**
     * Возвращает сконвертированный Unicode текст в формате base64, совместимый с github
     * @param {string} text - исходная Unicode строка
     * @returns {string}
     */
    this.textToBase64 = function (text) {
        return btoa(unescape(encodeURIComponent(text)));
    }

    /**
     * Возвращает jQuery promise который при успешном результате ресолвится данными
     *
     * @param {string} branchName - имя будущей ветки
     * @param {string} parentBranchHash - sha хеш от какой ветки отводить новую ветку
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    this.createBranch = function (branchName, parentBranchHash) {
        var branchPath = 'refs/heads/' + this._currentUserLogin + '/' + branchName;
        var token = this._currentToken;

        popup('Создается ветка для сохранения...', 'info');
        return $
            .ajax({
                method: "POST",
                url: "https://api.github.com/repos/prosvita/QIRIMTATARTILI/git/refs",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', 'token ' + token);
                },
                data: JSON.stringify({
                    ref: branchPath,
                    sha: parentBranchHash
                })
            })
            .done(function( msg ) {
                console.log('done triggered', msg)
            })
            .fail(function(err) {
                popup('Не удалось создать ветку ' + branchPath + ' Ошибка:' + err, 'danger');
            });
    };

    /**
     * Этот метод создает коммит с изменениями в одном файле.
     * Возвращает jQuery promise который при успешном результате ресолвится хешом успешного коммита
     *
     * @param {string} content - текст который пушим
     * @param {string} filePath - путь к файлу в который коммитим
     * @param {string} branchName - имя будущей ветки
     * @param {string} parentCommit - sha хеш от какого коммита вносятся изменения в файл
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    this.pushCommit = function (content, filePath, branchName, parentCommit) {
        var post = {
            message: 'test github api',
            committer: {
                name: 'Elnur Kurtaliev',
                email: 'el92@yandex.ru'
            },
            branch: branchName,
            content: this.textToBase64(content),
            sha: parentCommit
        };
        var token = this._currentToken;

        return $
            .ajax({
                method: 'PUT',
                url: filePath,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', 'token ' + token);
                },
                data: JSON.stringify(post)
            })
            .done(function (msg) {
                console.log('done triggered', msg)
            }).fail(function (err) {
                popup('Не удалось отправить изменения в файле ' + filePath + ' Ошибка:' + err, 'danger');
            });
    }

    /**
     * Этот метод создает коммит с изменениями в одном файле.
     * Возвращает jQuery promise который при успешном результате ресолвится хешом успешного коммита
     *
     * @param {string} content - текст который пушим
     * @param {string} filePath - путь к файлу в который коммитим
     * @param {string} branchName - имя будущей ветки
     * @param {string} parentCommit - sha хеш от какого коммита вносятся изменения в файл
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    this.getUser = function () {
        var token = this._currentToken;

        return $
            .ajax({
                method: 'GET',
                url: 'https://api.github.com/user',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', 'token ' + token);
                }
            })
            .done(function (msg) {
                console.log('done triggered', msg)
            }).fail(function (err) {
                popup('Не удалось получить данные пользователя.<br>Ошибка: [' + err.responseJSON.message + ']', 'danger');
            });
    }
};
