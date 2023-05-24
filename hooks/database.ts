import React, { useState, useEffect } from "react";

const useDatabase = () => {
  const [isDatabaseInitialized, setIsDatabaseInitialized] = useState(false);

  useEffect(() => {
    // Initialize the database only once.
    if (!isDatabaseInitialized) {
      // Do your database initialization here.
      setIsDatabaseInitialized(true);
    }
  }, []);

  return isDatabaseInitialized;
};

export default useDatabase;
