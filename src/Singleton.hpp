////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                  This file is part of CrossDrive's UC3                     //
//             Copyright: (c) 2016 German Aerospace Center (DLR)              //
//                                                                            //
//                                 authors:                                   //
//                         flat_ma, enge_wi, schn_s7                          //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////

#ifndef SINGLETON_HPP_HEADER_GUARD
#define SINGLETON_HPP_HEADER_GUARD

////////////////////////////////////////////////////////////////////////////////
// This is base class for singletons.                                         //
////////////////////////////////////////////////////////////////////////////////

// -----------------------------------------------------------------------------
template <typename T>
class Singleton {

  ///////////////////////////////////////////////////////////////////////////////
  // ----------------------------------------------------------- public
  // interface
 public:
  // Gets the instance. Singletons are classes, which are only instanciated
  // once. This method will create this instance if necessary and return a
  // reference to it.
  static T& Get() {
    if (m_pIinstance == nullptr) {
      m_pIinstance = new T();
    }

    return *m_pIinstance;
  }

  // Deletes the instance of this Singleton. The instance of this singleton will
  // be deleted by this method.
  static void DestroyInstance() {
    if (m_pIinstance != nullptr) {
      delete m_pIinstance;
      m_pIinstance = nullptr;
    }
  }

  ///////////////////////////////////////////////////////////////////////////////
  // -------------------------------------------------------- protected
  // interface
 protected:
  // Constructor. Has to be private in derived classe.
  Singleton() {
  }

  ///////////////////////////////////////////////////////////////////////////////
  // ---------------------------------------------------------- private
  // interface
 private:
  Singleton(Singleton const& copy) {
  }

  static T* m_pIinstance;
};

// the actual instance of this template
template <typename T>
T* Singleton<T>::m_pIinstance = nullptr;

#endif // SINGLETON_HPP_HEADER_GUARD
