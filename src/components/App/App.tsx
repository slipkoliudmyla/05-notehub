import { useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { useDebouncedCallback } from 'use-debounce';
import { createNote, deleteNote, fetchNotes } from '../../services/noteService';
import css from './App.module.css';
import NoteList from '../NoteList/NoteList';
import Pagination from '../Pagination/Pagination';
import Modal from '../Modal/Modal';
import NoteForm from '../NoteForm/NoteForm';
import SearchBox from '../SearchBox/SearchBox';
import Loader from '../Loader/Loader';
import ErrorMessage from '../ErrorMessage/ErrorMessage';
import EmptyMessage from '../EmptyMessage/EmptyMessage';

function App() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selectedPage, setSelectedPage] = useState(1);
  const [isModalOpened, setModalOpened] = useState(false);

  const { data, isFetching, isError, isSuccess, isPlaceholderData } = useQuery({
    queryKey: ['notes', query, selectedPage],
    queryFn: ({ signal }) =>
      fetchNotes({ search: query, page: selectedPage, signal }),
    placeholderData: keepPreviousData,
  });

  const createNoteMutation = useMutation({
    mutationFn: createNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
      handleModalClose();
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: async (deletedNote) => {
      if (
        !isPlaceholderData &&
        data?.notes.length === 1 &&
        data.notes[0].id === deletedNote.id &&
        selectedPage > 1
      ) {
        setSelectedPage((page) => page - 1);
      }
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const handleModalOpen = () => {
    setModalOpened(true);
  };

  const handleModalClose = () => {
    setModalOpened(false);
  };

  const handleSearchNotes = useDebouncedCallback((query: string) => {
    setQuery(query.trim());
    setSelectedPage(1);
  }, 300);

  return (
    <div className={css.app}>
      <header className={css.toolbar}>
        <SearchBox
          value={search}
          onChange={(value: string) => {
            setSearch(value);
            handleSearchNotes(value);
          }}
        />
        {isSuccess && data.totalPages > 1 && (
          <Pagination
            pages={data.totalPages}
            selectedPage={selectedPage}
            onPageChange={setSelectedPage}
          />
        )}
        <button
          className={css.button}
          type="button"
          disabled={createNoteMutation.isPending}
          onClick={handleModalOpen}
        >
          Create note +
        </button>
      </header>
      {isFetching && <Loader />}
      {isSuccess && data.notes.length > 0 && (
        <NoteList
          notes={data.notes}
          onDelete={deleteNoteMutation.mutate}
          isDeleting={deleteNoteMutation.isPending || isPlaceholderData}
        />
      )}
      {isSuccess && !isPlaceholderData && data.notes.length === 0 && (
        <EmptyMessage query={query} />
      )}
      {isError && <ErrorMessage />}
      {deleteNoteMutation.isError && (
        <ErrorMessage message="Could not delete the note. Please try again." />
      )}
      {isModalOpened && (
        <Modal onClose={handleModalClose}>
          <NoteForm
            onCancel={handleModalClose}
            onSubmit={async (note) => {
              await createNoteMutation.mutateAsync({
                ...note,
                title: note.title.trim(),
              });
            }}
          />
        </Modal>
      )}
    </div>
  );
}

export default App;
