﻿using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using WatchWord.DataAccess.Repositories;
using WatchWord.Domain.Entity;
using WatchWord.DataAccess;

namespace WatchWord.Service
{
    /// <summary>Represents a layer for work with settings.</summary>
    public class SettingsService : ISettingsService
    {
        private readonly IWatchWordUnitOfWork unitOfWork;
        private readonly ISettingsRepository settingsRepository;
        private readonly IAccountsService accountsService;

        /// <summary>These keys contain the specified data types.</summary>
        private static readonly Dictionary<SettingKey, SettingType> SettingKeyToTypeMapping = new Dictionary<SettingKey, SettingType>
        {
            { SettingKey.YandexDictionaryApiKey, SettingType.String },
            { SettingKey.YandexTranslateApiKey, SettingType.String }
        };

        /// <summary>These keys are responsible for the configuration of the site.</summary>
        private static readonly List<SettingKey> SiteSettingsKeys = new List<SettingKey>
        {
            SettingKey.YandexDictionaryApiKey,
            SettingKey.YandexTranslateApiKey
        };

        /// <summary>Prevents a default instance of the <see cref="SettingsService"/> class from being created.</summary>
        // ReSharper disable once UnusedMember.Local
        private SettingsService() { }

        /// <summary>Initializes a new instance of the <see cref="SettingsService"/> class.</summary>
        /// <param name="watchWordUnitOfWork">Unit of work over WatchWord repositories.</param>
        public SettingsService(IWatchWordUnitOfWork unitOfWork, IAccountsService accountsService)
        {
            this.unitOfWork = unitOfWork;
            settingsRepository = unitOfWork.Repository<ISettingsRepository>();
            this.accountsService = accountsService;
        }

        public async Task<List<Setting>> GetUnfilledSiteSettings()
        {
            var filledAdminSettings = await settingsRepository.GetAllAsync(s => SiteSettingsKeys.Contains(s.Key));
            var unfilledAdminSettings = (from settingKey in SiteSettingsKeys
                                         where filledAdminSettings.All(s => s.Key != settingKey)
                                         select CreateNewEmptySettingByKey(settingKey)).ToList();

            return unfilledAdminSettings;
        }

        public async Task<int> InsertSiteSettings(List<Setting> settings)
        {
            //TODO: universal parser
            foreach (var setting in settings)
            {
                if (setting.Type == SettingType.String && !string.IsNullOrEmpty(setting.String))
                {
                    settingsRepository.Insert(setting);
                }
            }

            return await unitOfWork.SaveAsync();
        }

        public async Task<Setting> GetSiteSettingAsync(SettingKey key)
        {
            return await settingsRepository.GetByConditionAsync(s => s.Key == key && s.Owner == null);
        }

        /// <summary>Creates new empty setting with the specified key.</summary>
        /// <param name="key">Setting key.</param>
        /// <returns>Setting entity.</returns>
        private static Setting CreateNewEmptySettingByKey(SettingKey key)
        {
            var newSetting = new Setting { Key = key };

            var mapping = SettingKeyToTypeMapping.First(m => m.Key == key);
            newSetting.Type = mapping.Value;

            return newSetting;
        }
    }
}