﻿using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using WatchWord.Domain.Entities;

namespace WatchWord.FavoriteMaterials
{
    public class FavoriteMaterialAppService : WatchWordAppServiceBase, IFavoriteMaterialAppService
    {
        private readonly IRepository<FavoriteMaterial, long> _favoriteMaterialRepository;
        private readonly IRepository<Material, long> _materialRepository;

        public FavoriteMaterialAppService(IRepository<FavoriteMaterial, long> favoriteMaterialRepository,
            IRepository<Material, long> materialRepository)
        {
            _favoriteMaterialRepository = favoriteMaterialRepository;
            _materialRepository = materialRepository;
        }

        public async Task Post(int materialId)
        {
            var account = await GetCurrentUserAsync();
            var material = _materialRepository.Get(materialId);
            var favoriteMaterial = new FavoriteMaterial
            {
                Account = account,
                Material = material
            };

            _favoriteMaterialRepository.Insert(favoriteMaterial);
        }

        public async Task<bool> Get(int materialId)
        {
            var account = await GetCurrentUserAsync();
            return _favoriteMaterialRepository.GetAll().Where(f => f.Material.Id == materialId && f.Account.Id == account.Id).Any();
        }


        public async Task Delete(int materialId)
        {
            await _favoriteMaterialRepository.DeleteAsync(materialId);
        }
    }
}
