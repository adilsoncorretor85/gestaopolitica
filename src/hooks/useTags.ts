import { useState, useEffect, useCallback } from 'react';
import { tagsService, Tag, PersonWithTags, SearchPeopleParams } from '../services/tags';

export const useTags = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tagsService.getAvailableTags();
      setTags(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    tags,
    loading,
    error,
    refetch: fetchTags
  };
};

export const usePeopleWithTags = (params: SearchPeopleParams = {}) => {
  const [people, setPeople] = useState<PersonWithTags[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const searchPeople = useCallback(async (searchParams: SearchPeopleParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await tagsService.searchPeopleWithTags({ ...params, ...searchParams });
      setPeople(data);
      setTotalCount(data.length > 0 ? data[0].total_count : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar pessoas');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (Object.keys(params).length === 0) {
      searchPeople();
    }
  }, [searchPeople]);

  return {
    people,
    loading,
    error,
    totalCount,
    search: searchPeople
  };
};

export const usePersonTags = (personId: string) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonTags = useCallback(async () => {
    if (!personId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await tagsService.getPersonTags(personId);
      setTags(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tags da pessoa');
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    fetchPersonTags();
  }, [fetchPersonTags]);

  const applyTag = useCallback(async (tagId: string) => {
    try {
      const result = await tagsService.applyTagToPerson(personId, tagId);
      if (result.success) {
        await fetchPersonTags(); // Recarregar tags
      }
      return result;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao aplicar tag' };
    }
  }, [personId, fetchPersonTags]);

  const removeTag = useCallback(async (tagId: string) => {
    try {
      const result = await tagsService.removeTagFromPerson(personId, tagId);
      if (result.success) {
        await fetchPersonTags(); // Recarregar tags
      }
      return result;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao remover tag' };
    }
  }, [personId, fetchPersonTags]);

  return {
    tags,
    loading,
    error,
    applyTag,
    removeTag,
    refetch: fetchPersonTags
  };
};
